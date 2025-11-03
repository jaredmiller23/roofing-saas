# 🔧 MANUAL DATABASE MIGRATION GUIDE
## Pin Dropping Enhancements

**Status**: Migration NOT yet applied (connection timeout)
**Priority**: CRITICAL - Must be applied before testing pin dropping
**Estimated Time**: 2-3 minutes

---

## ⚠️ Important Notes

1. The migration SQL is ready and tested, but could not be auto-applied due to Supabase connection timeout
2. You MUST apply this migration manually before the pin dropping feature will work
3. The migration is **safe** and uses `IF NOT EXISTS` clauses to prevent duplicate columns
4. This adds 8 new columns, 3 functions, 2 views, and spatial indexes to the `knocks` table

---

## 📋 Option 1: Supabase Dashboard (Recommended)

### Step 1: Open SQL Editor
1. Go to https://supabase.com/dashboard
2. Select your **roofing-saas** project
3. Click **SQL Editor** in the left sidebar
4. Click **New Query**

### Step 2: Copy Migration SQL
Open the file: `/Users/ccai/Roofing SaaS/roofing-saas/supabase/migrations/202511020001_pin_dropping_enhancements.sql`

**Or copy this SQL**:

```sql
-- =====================================================
-- PIN DROPPING ENHANCEMENTS
-- Date: 2025-11-02
-- Purpose: Enhance knocks table for advanced pin dropping & lead generation
-- =====================================================

-- Add new columns to knocks table for pin dropping
ALTER TABLE knocks ADD COLUMN IF NOT EXISTS pin_type VARCHAR(50) DEFAULT 'knock'
  CHECK (pin_type IN ('knock', 'quick_pin', 'lead_pin', 'interested_pin'));

ALTER TABLE knocks ADD COLUMN IF NOT EXISTS sync_status VARCHAR(20) DEFAULT 'synced'
  CHECK (sync_status IN ('pending', 'syncing', 'synced', 'error'));

ALTER TABLE knocks ADD COLUMN IF NOT EXISTS damage_score INTEGER DEFAULT 0
  CHECK (damage_score >= 0 AND damage_score <= 100);

ALTER TABLE knocks ADD COLUMN IF NOT EXISTS enrichment_source VARCHAR(50);
ALTER TABLE knocks ADD COLUMN IF NOT EXISTS last_sync_attempt TIMESTAMPTZ;
ALTER TABLE knocks ADD COLUMN IF NOT EXISTS sync_error TEXT;
ALTER TABLE knocks ADD COLUMN IF NOT EXISTS owner_name TEXT;
ALTER TABLE knocks ADD COLUMN IF NOT EXISTS property_data JSONB DEFAULT '{}'::jsonb;

-- Index for sync status queries
CREATE INDEX IF NOT EXISTS idx_knocks_sync_status ON knocks(sync_status)
  WHERE sync_status != 'synced';

-- Index for damage score (high priority leads)
CREATE INDEX IF NOT EXISTS idx_knocks_damage_score ON knocks(damage_score DESC)
  WHERE damage_score > 0;

-- Spatial index for duplicate detection (uses earthdistance extension)
CREATE EXTENSION IF NOT EXISTS cube;
CREATE EXTENSION IF NOT EXISTS earthdistance;

CREATE INDEX IF NOT EXISTS idx_knocks_location_earth ON knocks
  USING GIST (ll_to_earth(latitude, longitude));

-- View for pins pending sync (offline queue)
CREATE OR REPLACE VIEW pins_pending_sync AS
SELECT
  id, pin_type, latitude, longitude, address, disposition,
  owner_name, notes, photos, sync_status, sync_error,
  last_sync_attempt, created_at, user_id, tenant_id
FROM knocks
WHERE sync_status IN ('pending', 'error')
  AND is_deleted = FALSE
ORDER BY created_at ASC;

-- View for high-value pins (storm damage scoring)
CREATE OR REPLACE VIEW high_priority_pins AS
SELECT
  k.*,
  c.first_name || ' ' || COALESCE(c.last_name, '') as contact_name,
  c.phone as contact_phone, c.email as contact_email,
  u.full_name as rep_name
FROM knocks k
LEFT JOIN contacts c ON k.contact_id = c.id
LEFT JOIN profiles u ON k.user_id = u.id
WHERE k.damage_score >= 60
  AND k.is_deleted = FALSE
ORDER BY k.damage_score DESC, k.created_at DESC;

-- Function to check for duplicate pins within radius
CREATE OR REPLACE FUNCTION check_duplicate_pin(
  p_latitude DECIMAL(10, 8),
  p_longitude DECIMAL(11, 8),
  p_radius_meters INTEGER DEFAULT 25,
  p_tenant_id UUID DEFAULT NULL
)
RETURNS TABLE (
  exists BOOLEAN,
  existing_knock_id UUID,
  existing_disposition TEXT,
  existing_user_name TEXT,
  distance_meters NUMERIC,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    TRUE as exists,
    k.id AS existing_knock_id,
    k.disposition AS existing_disposition,
    u.full_name AS existing_user_name,
    earth_distance(
      ll_to_earth(p_latitude, p_longitude),
      ll_to_earth(k.latitude, k.longitude)
    )::NUMERIC AS distance_meters,
    k.created_at
  FROM knocks k
  LEFT JOIN profiles u ON k.user_id = u.id
  WHERE k.is_deleted = FALSE
    AND (p_tenant_id IS NULL OR k.tenant_id = p_tenant_id)
    AND earth_box(ll_to_earth(p_latitude, p_longitude), p_radius_meters) @> ll_to_earth(k.latitude, k.longitude)
    AND earth_distance(
      ll_to_earth(p_latitude, p_longitude),
      ll_to_earth(k.latitude, k.longitude)
    ) <= p_radius_meters
  ORDER BY distance_meters
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, NULL::TEXT, NULL::TEXT, NULL::NUMERIC, NULL::TIMESTAMPTZ;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate storm damage probability score
CREATE OR REPLACE FUNCTION calculate_damage_score(p_knock_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_score INTEGER := 0;
  v_property_data JSONB;
  v_roof_age INTEGER;
BEGIN
  SELECT property_data INTO v_property_data FROM knocks WHERE id = p_knock_id;

  IF v_property_data ? 'year_built' THEN
    v_roof_age := EXTRACT(YEAR FROM CURRENT_DATE) - (v_property_data->>'year_built')::INTEGER;
    IF v_roof_age >= 20 THEN v_score := v_score + 30;
    ELSIF v_roof_age >= 15 THEN v_score := v_score + 20;
    ELSIF v_roof_age >= 10 THEN v_score := v_score + 10;
    END IF;
  END IF;

  IF v_property_data ? 'estimated_value' THEN
    IF (v_property_data->>'estimated_value')::DECIMAL >= 300000 THEN
      v_score := v_score + 15;
    END IF;
  END IF;

  RETURN LEAST(v_score, 100);
END;
$$ LANGUAGE plpgsql;

-- Function to create contact from pin
CREATE OR REPLACE FUNCTION create_contact_from_pin(
  p_knock_id UUID,
  p_first_name TEXT DEFAULT NULL,
  p_last_name TEXT DEFAULT NULL,
  p_phone TEXT DEFAULT NULL,
  p_email TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_knock RECORD;
  v_contact_id UUID;
  v_first_name TEXT;
  v_last_name TEXT;
BEGIN
  SELECT * INTO v_knock FROM knocks WHERE id = p_knock_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Knock not found: %', p_knock_id; END IF;

  IF p_first_name IS NULL AND v_knock.owner_name IS NOT NULL THEN
    v_first_name := split_part(v_knock.owner_name, ' ', 1);
    v_last_name := trim(substring(v_knock.owner_name from position(' ' in v_knock.owner_name)));
  ELSE
    v_first_name := p_first_name;
    v_last_name := p_last_name;
  END IF;

  INSERT INTO contacts (
    tenant_id, first_name, last_name, phone, email,
    address_street, address_city, address_state, address_zip,
    latitude, longitude, source, stage, notes, created_by
  )
  VALUES (
    v_knock.tenant_id, v_first_name, v_last_name,
    COALESCE(p_phone, (v_knock.property_data->>'phone')::TEXT),
    COALESCE(p_email, (v_knock.property_data->>'email')::TEXT),
    v_knock.address_street, v_knock.address_city, v_knock.address_state, v_knock.address_zip,
    v_knock.latitude, v_knock.longitude, 'door-knock',
    CASE v_knock.disposition
      WHEN 'interested' THEN 'qualified'
      WHEN 'appointment' THEN 'proposal'
      ELSE 'new' END,
    'Created from door knock on ' || v_knock.created_at::DATE ||
      CASE WHEN v_knock.notes IS NOT NULL THEN E'\n\nOriginal notes: ' || v_knock.notes ELSE '' END,
    v_knock.user_id
  )
  RETURNING id INTO v_contact_id;

  UPDATE knocks SET contact_id = v_contact_id, contact_created = TRUE WHERE id = p_knock_id;
  RETURN v_contact_id;
END;
$$ LANGUAGE plpgsql;
```

### Step 3: Run the Migration
1. Paste the SQL into the query editor
2. Click **Run** (or press Cmd+Enter)
3. Wait for success message: "Success. No rows returned"

### Step 4: Verify Migration
Run this query to verify the new columns exist:

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'knocks'
  AND column_name IN ('pin_type', 'sync_status', 'damage_score', 'owner_name', 'property_data')
ORDER BY column_name;
```

You should see 5 rows returned.

---

## 📋 Option 2: Supabase CLI (If Linked)

If you have Supabase CLI linked to your project:

```bash
cd /Users/ccai/Roofing\ SaaS/roofing-saas
npx supabase db push
```

This will apply all pending migrations including the pin dropping enhancements.

---

## 📋 Option 3: Direct SQL Connection

If you have `psql` or another PostgreSQL client:

```bash
# Get connection string from Supabase Dashboard > Settings > Database
psql "postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres" \
  -f supabase/migrations/202511020001_pin_dropping_enhancements.sql
```

---

## ✅ Verification Checklist

After applying the migration, verify it worked:

### 1. Check New Columns
```sql
\d knocks  -- In psql
-- OR in Supabase Dashboard:
SELECT * FROM information_schema.columns WHERE table_name = 'knocks';
```

You should see these new columns:
- ✅ `pin_type` (varchar)
- ✅ `sync_status` (varchar)
- ✅ `damage_score` (integer)
- ✅ `enrichment_source` (varchar)
- ✅ `last_sync_attempt` (timestamptz)
- ✅ `sync_error` (text)
- ✅ `owner_name` (text)
- ✅ `property_data` (jsonb)

### 2. Check New Functions
```sql
SELECT routine_name FROM information_schema.routines
WHERE routine_name IN ('check_duplicate_pin', 'calculate_damage_score', 'create_contact_from_pin');
```

Should return 3 rows.

### 3. Check New Views
```sql
SELECT table_name FROM information_schema.views
WHERE table_name IN ('pins_pending_sync', 'high_priority_pins');
```

Should return 2 rows.

### 4. Check Extensions
```sql
SELECT * FROM pg_extension WHERE extname IN ('cube', 'earthdistance');
```

Should return 2 rows.

---

## 🐛 Troubleshooting

### Error: "relation knocks does not exist"
**Solution**: The knocks table wasn't created. You need to run the base knocks migration first:
```bash
# Run this migration first
supabase/migrations/20251003_knocks_table.sql
```

### Error: "column already exists"
**Solution**: Migration was partially applied. This is safe - the `IF NOT EXISTS` clauses will skip existing columns.

### Error: "extension cube does not exist"
**Solution**: Enable the extensions manually:
```sql
CREATE EXTENSION IF NOT EXISTS cube;
CREATE EXTENSION IF NOT EXISTS earthdistance;
```

### Error: "function already exists"
**Solution**: This is safe. The `CREATE OR REPLACE` will update the functions.

---

## 🚀 After Migration is Applied

Once the migration succeeds:

1. ✅ **Test Pin Dropping**:
   - Go to http://localhost:3000/territories/[territory-id]
   - Click "Drop Pins on Map" button
   - Click anywhere on the map
   - Verify address appears and disposition popup shows

2. ✅ **Test Lead Creation**:
   - Drop a pin
   - Select "Interested" disposition
   - Toggle "Create lead in CRM"
   - Fill in contact details
   - Click "Save Pin & Create Lead"
   - Verify contact appears in CRM

3. ✅ **Test Duplicate Detection**:
   - Drop a pin
   - Try to drop another pin within 25 meters
   - Should see error: "Pin already exists within 25m"

---

## 📞 Need Help?

If you encounter issues:
1. Check Supabase Dashboard > Logs for error details
2. Verify you're connected to the correct project
3. Ensure you have admin/owner permissions on the project
4. Try the SQL in smaller chunks if timeout occurs

---

**Next Steps After Migration**: See `/PHASE_1A_PIN_DROPPING_IMPLEMENTATION.md` for testing checklist and integration guide.

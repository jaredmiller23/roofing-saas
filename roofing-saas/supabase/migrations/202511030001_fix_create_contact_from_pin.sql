-- Fix create_contact_from_pin function
-- Issue: Function was referencing non-existent field "damage_indicators"

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
  -- Get knock data
  SELECT * INTO v_knock
  FROM knocks
  WHERE id = p_knock_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Knock not found: %', p_knock_id;
  END IF;

  -- Parse owner name if provided via property enrichment
  IF p_first_name IS NULL AND v_knock.owner_name IS NOT NULL THEN
    -- Simple name parsing (first word = first name, rest = last name)
    v_first_name := split_part(v_knock.owner_name, ' ', 1);
    v_last_name := trim(substring(v_knock.owner_name from position(' ' in v_knock.owner_name)));
  ELSE
    v_first_name := p_first_name;
    v_last_name := p_last_name;
  END IF;

  -- Create contact
  INSERT INTO contacts (
    tenant_id,
    first_name,
    last_name,
    phone,
    email,
    address_street,
    address_city,
    address_state,
    address_zip,
    latitude,
    longitude,
    source,
    stage,
    notes,
    created_by
  )
  VALUES (
    v_knock.tenant_id,
    v_first_name,
    v_last_name,
    COALESCE(p_phone, (v_knock.property_data->>'phone')::TEXT),
    COALESCE(p_email, (v_knock.property_data->>'email')::TEXT),
    v_knock.address_street,
    v_knock.address_city,
    v_knock.address_state,
    v_knock.address_zip,
    v_knock.latitude,
    v_knock.longitude,
    'door-knock',
    CASE v_knock.disposition
      WHEN 'interested' THEN 'qualified'
      WHEN 'appointment' THEN 'proposal'
      ELSE 'new'
    END,
    'Created from door knock on ' || v_knock.created_at::DATE ||
      CASE WHEN v_knock.notes IS NOT NULL
        THEN E'\n\nOriginal notes: ' || v_knock.notes
        ELSE ''
      END,
    v_knock.user_id
  )
  RETURNING id INTO v_contact_id;

  -- Update knock to link to contact
  UPDATE knocks
  SET
    contact_id = v_contact_id,
    contact_created = TRUE
  WHERE id = p_knock_id;

  RETURN v_contact_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

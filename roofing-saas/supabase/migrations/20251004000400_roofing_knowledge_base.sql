-- =====================================================
-- ROOFING KNOWLEDGE BASE WITH VECTOR SEARCH
-- =====================================================
-- Enable semantic search for voice assistant using pgvector
-- OpenAI text-embedding-3-small generates 1536-dimensional vectors

-- Enable pgvector extension for vector similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- =====================================================
-- KNOWLEDGE BASE TABLE
-- =====================================================

CREATE TABLE roofing_knowledge (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Content fields
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL, -- 'materials', 'warranties', 'installation', 'codes', 'safety', 'pricing', 'manufacturer', 'troubleshooting'
  subcategory TEXT, -- 'shingles', 'metal', 'TPO', 'EPDM', etc.

  -- Vector embedding for semantic search (1536 dimensions for text-embedding-3-small)
  embedding vector(1536),

  -- Metadata
  tags TEXT[] DEFAULT '{}',
  source_url TEXT, -- Reference to manufacturer docs, building codes, etc.
  manufacturer TEXT, -- GAF, Owens Corning, CertainTeed, etc.
  last_verified_at TIMESTAMPTZ,

  -- Multi-tenant support
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  is_global BOOLEAN DEFAULT TRUE, -- Global knowledge vs tenant-specific

  -- Search optimization
  search_vector tsvector GENERATED ALWAYS AS (
    to_tsvector('english', coalesce(title, '') || ' ' || coalesce(content, '') || ' ' || coalesce(category, ''))
  ) STORED,

  -- Audit fields
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  is_active BOOLEAN DEFAULT TRUE
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Vector similarity search index (HNSW algorithm for fast approximate nearest neighbor)
CREATE INDEX idx_roofing_knowledge_embedding ON roofing_knowledge
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Full-text search index
CREATE INDEX idx_roofing_knowledge_search ON roofing_knowledge USING GIN (search_vector);

-- Category filtering
CREATE INDEX idx_roofing_knowledge_category ON roofing_knowledge(category);
CREATE INDEX idx_roofing_knowledge_manufacturer ON roofing_knowledge(manufacturer);

-- Multi-tenant filtering
CREATE INDEX idx_roofing_knowledge_tenant ON roofing_knowledge(tenant_id) WHERE tenant_id IS NOT NULL;
CREATE INDEX idx_roofing_knowledge_global ON roofing_knowledge(is_global) WHERE is_global = TRUE;

-- Active records
CREATE INDEX idx_roofing_knowledge_active ON roofing_knowledge(is_active) WHERE is_active = TRUE;

-- =====================================================
-- SEARCH QUERIES TABLE (ANALYTICS)
-- =====================================================

CREATE TABLE knowledge_search_queries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,

  -- Query details
  query_text TEXT NOT NULL,
  query_embedding vector(1536),

  -- Results
  results_count INTEGER,
  top_result_id UUID REFERENCES roofing_knowledge(id),
  relevance_score FLOAT,

  -- Context
  user_id UUID REFERENCES auth.users(id),
  session_id TEXT,
  voice_call_id UUID, -- Link to voice assistant call if applicable

  -- Analytics
  was_helpful BOOLEAN,
  feedback_text TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_knowledge_queries_tenant ON knowledge_search_queries(tenant_id);
CREATE INDEX idx_knowledge_queries_created ON knowledge_search_queries(created_at DESC);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE roofing_knowledge ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_search_queries ENABLE ROW LEVEL SECURITY;

-- Global knowledge is readable by all authenticated users
CREATE POLICY "Global knowledge readable by all authenticated users"
  ON roofing_knowledge FOR SELECT
  TO authenticated
  USING (is_global = TRUE OR tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- Tenant-specific knowledge only readable by tenant members
CREATE POLICY "Tenant knowledge readable by tenant members"
  ON roofing_knowledge FOR SELECT
  TO authenticated
  USING (
    tenant_id IS NULL OR
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
  );

-- Only admins can insert/update knowledge (tenant_id required for non-global)
CREATE POLICY "Admins can manage knowledge"
  ON roofing_knowledge FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_role_assignments ura
      JOIN user_roles ur ON ura.role_id = ur.id
      WHERE ura.user_id = auth.uid()
      AND ur.name IN ('owner', 'admin')
      AND ura.tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    )
  );

-- Search queries: users can only see their own
CREATE POLICY "Users can view their own search queries"
  ON knowledge_search_queries FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create search queries"
  ON knowledge_search_queries FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() AND
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
  );

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to search knowledge base using vector similarity
CREATE OR REPLACE FUNCTION search_roofing_knowledge(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 5,
  filter_category text DEFAULT NULL,
  filter_tenant_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  title text,
  content text,
  category text,
  subcategory text,
  manufacturer text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    rk.id,
    rk.title,
    rk.content,
    rk.category,
    rk.subcategory,
    rk.manufacturer,
    1 - (rk.embedding <=> query_embedding) AS similarity
  FROM roofing_knowledge rk
  WHERE
    rk.is_active = TRUE
    AND (filter_category IS NULL OR rk.category = filter_category)
    AND (
      rk.is_global = TRUE OR
      (filter_tenant_id IS NOT NULL AND rk.tenant_id = filter_tenant_id)
    )
    AND 1 - (rk.embedding <=> query_embedding) > match_threshold
  ORDER BY rk.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_roofing_knowledge_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_roofing_knowledge_timestamp
BEFORE UPDATE ON roofing_knowledge
FOR EACH ROW
EXECUTE FUNCTION update_roofing_knowledge_updated_at();

-- =====================================================
-- INITIAL SEED DATA (GLOBAL KNOWLEDGE)
-- =====================================================

-- Sample roofing knowledge entries (embeddings will be generated via API)
INSERT INTO roofing_knowledge (title, content, category, subcategory, manufacturer, is_global) VALUES

-- Warranties
('GAF System Plus Warranty', 'GAF System Plus warranty provides 50-year non-prorated coverage on shingles and 25-year coverage on accessories when using all GAF components (shingles, underlayment, starter, ridge cap, and leak barrier). Requires GAF Master Elite certification for installation. Coverage includes material defects, wind damage up to 130 mph with LayerLock technology, and algae resistance. Non-transferable after first owner unless transferred within first year. Filing claims requires proof of purchase and installation by certified contractor.', 'warranties', 'shingles', 'GAF', TRUE),

('Owens Corning Platinum Protection', 'Owens Corning Platinum Protection offers lifetime limited warranty on Duration series shingles with 15-year SureNail strip coverage. Includes 10-year StreakGuard algae protection and wind resistance up to 130 mph when installed with Owens Corning accessories. Available only through Platinum Preferred contractors. Warranty covers manufacturing defects and includes labor costs for first 10 years at 100%, years 11-20 at 50%, then material only. Transferable once with 10-year coverage for new owner.', 'warranties', 'shingles', 'Owens Corning', TRUE),

('CertainTeed StreakFighter Warranty', 'CertainTeed StreakFighter warranty provides 25-year algae resistance guarantee on Landmark series shingles. If algae staining occurs, CertainTeed will replace shingles or reimburse for professional cleaning. Requires proper attic ventilation (1:150 ratio minimum) and installation per CertainTeed specs. Wind warranty up to 110 mph standard, upgradable to 130 mph with special installation. Lifetime limited warranty on materials, 50-year on workmanship when installed by SELECT ShingleMaster.', 'warranties', 'shingles', 'CertainTeed', TRUE),

-- Materials - Shingles
('Architectural vs 3-Tab Shingles', 'Architectural (dimensional) shingles are thicker, more durable, and provide better aesthetics than 3-tab shingles. Architectural shingles: 250-400 lbs per square, 30-50 year lifespan, better wind resistance (110-130 mph), dimensional appearance, $90-160 per square. 3-tab shingles: 200-250 lbs per square, 20-25 year lifespan, basic wind resistance (60-70 mph), flat appearance, $65-95 per square. Architectural recommended for all residential applications in Tennessee climate.', 'materials', 'shingles', NULL, TRUE),

('Impact Resistant Shingles (Class 4)', 'Class 4 impact resistant shingles use modified asphalt and reinforced mat to resist hail damage. Pass UL 2218 test with 2-inch steel ball drops. Qualify for insurance discounts (typically 15-35% in Tennessee). Popular brands: GAF Timberline HDZ, Owens Corning Duration FLEX, CertainTeed Landmark IR. Cost premium: $15-25 per square over standard shingles. Required in some HOAs and recommended in hail-prone areas. Installation same as standard shingles but check manufacturer specs for nail placement.', 'materials', 'shingles', NULL, TRUE),

-- Materials - Underlayment
('Synthetic vs Felt Underlayment', 'Synthetic underlayment outperforms felt in all categories: Synthetic (Titanium, DiamondDeck): 20-30 year lifespan, UV resistant 6-12 months, 250-300 lb tear strength, lightweight, $75-110 per square. Felt (#30): 1-2 year lifespan, UV resistant 1-2 weeks, 50-60 lb tear strength, heavy, $40-60 per square. Synthetic recommended for all Tennessee roofs due to weather resistance and ease of installation. Required for some premium warranties.', 'materials', 'underlayment', NULL, TRUE),

('Ice and Water Shield Placement', 'Ice and water shield (peel-and-stick membrane) required in Tennessee on: valleys (36" wide minimum), eaves (one course, typically 36" from edge), penetrations (pipes, chimneys, skylights extend 6" beyond), dormers, and low-slope areas (<4:12). Popular brands: GAF WeatherWatch, Owens Corning WeatherLock, Grace Ice & Water Shield. Install smooth surface, avoid wrinkles, overlap 6" at seams. Temperature: install above 40°F, store flat. Cost: $1.50-2.50 per linear foot installed.', 'materials', 'underlayment', NULL, TRUE),

-- Installation
('Proper Nailing Pattern for Shingles', 'Proper nailing prevents blow-offs and ensures warranty coverage. Requirements: 4 nails minimum per shingle (6 in high-wind areas >110 mph), placed 1" above adhesive strip and 5/8" from edge. Nail type: 1-1/4" minimum length for new construction, 1-3/4" for reroof over existing shingles. Galvanized or aluminum only. Drive flush - not overdriven (breaks mat) or underdriven (allows uplift). Use roofing nail gun with adjustable depth at 90-120 PSI. Check local codes - some require 6 nails per shingle in high-wind zones.', 'installation', 'nailing', NULL, TRUE),

('Valley Installation Methods', 'Three valley methods approved in Tennessee: 1) Closed Cut Valley: Faster installation, shingles from one side cover valley, cut other side 2" from centerline, seal edges. Good for same-color roofs. 2) Open Valley: Most durable, metal flashing visible, use 24" wide aluminum or copper, embed in ice & water shield. Best for debris-prone areas. 3) Woven Valley: Traditional method, shingles interwoven across valley, requires skilled installer. Not recommended with architectural shingles (too thick). Always use ice & water shield under any valley type.', 'installation', 'valleys', NULL, TRUE),

-- Building Codes
('Tennessee Roofing Code Requirements', 'Tennessee follows IRC/IBC with amendments: Minimum roof slope: 2:12 for asphalt shingles (4:12 recommended), 3:12 for metal. Underlayment: Required on all slopes, ice & water shield on eaves in freeze zones. Ventilation: 1 sq ft per 150 sq ft attic space (1:300 with vapor barrier). Wind rating: 110 mph minimum (130 mph in some counties). Permits required for all reroofs and repairs >100 sq ft. Inspections: rough-in (deck), final. Fire rating: Class A required in most jurisdictions. Fall protection required >6 ft height.', 'codes', 'building', NULL, TRUE),

-- Safety
('OSHA Fall Protection Requirements', 'Fall protection required when working >6 feet above lower level. Options: 1) Guardrails: 42" height with mid-rail and toe board, preferred method. 2) Safety nets: Must extend 8 ft beyond edge, mesh <36 sq in. 3) Personal fall arrest: Full body harness, shock-absorbing lanyard, secure anchor point rated 5,000 lbs. Ladder safety: extend 3 ft above roof edge, secure at top, 4:1 angle ratio. Roof brackets and toe boards required on slopes >4:12. Training required annually. Inspection of equipment before each use. Penalties: $7,000-14,000 per violation.', 'safety', 'fall_protection', NULL, TRUE),

-- Pricing
('Tennessee Roofing Cost Breakdown 2024', 'Average residential reroof costs in Tennessee (per square, 100 sq ft): Labor: $150-250 (40-50% of total), Materials: $200-350 (shingles $90-160, underlayment $40-75, accessories $25-50, nails/adhesive $15-25), Disposal: $40-60 per ton (avg 3 tons), Equipment: $20-40 (dumpster, scaffolding). Total: $450-750 per square installed. Add-ons: Ice & water shield +$50-75/square, synthetic underlayment +$25-35/square, ventilation upgrades +$300-800, chimney reflash +$400-800, skylight replacement +$500-1200 each. Warranty: GAF System Plus adds $45-65/square.', 'pricing', 'residential', NULL, TRUE),

-- Troubleshooting
('Diagnosing Roof Leaks', 'Systematic leak diagnosis: 1) Interior inspection: locate water stains, measure from reference points (walls, chimney), check for multiple entry points (water travels). 2) Attic inspection: look for daylight, wet insulation, water stains on decking, follow trail upward. 3) Exterior inspection: check flashings first (90% of leaks), then valleys, then field shingles. Common leak sources: chimney flashing (35%), pipe boots (25%), valley failures (15%), ice dams (10%), wind-damaged shingles (10%), other (5%). Document with photos, measure distances for repair crew. Emergency fix: tarp secured with sandbags, not nailed through roof.', 'troubleshooting', 'leaks', NULL, TRUE);

-- Note: Embeddings must be generated and updated via API using OpenAI text-embedding-3-small
-- See POST /api/knowledge/generate-embeddings endpoint

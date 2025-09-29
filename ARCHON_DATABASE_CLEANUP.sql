-- Archon Database Cleanup Queries
-- Run these in Supabase SQL Editor: https://supabase.com/dashboard/project/pcduofjokergeakxgjpp/sql
-- Created: September 29, 2025

-- ================================================
-- STEP 1: INVESTIGATE THE PROBLEM
-- ================================================

-- Check how many 403 error records exist
SELECT
    COUNT(*) as error_count,
    CASE
        WHEN url LIKE '%twilio.com%' THEN 'Twilio'
        WHEN url LIKE '%elevenlabs%' THEN 'ElevenLabs'
        ELSE 'Other'
    END as domain
FROM archon_crawled_pages
WHERE content = '403 ERROR #'
GROUP BY domain;

-- View sample of Twilio 403 errors
SELECT
    id,
    url,
    content,
    created_at
FROM archon_crawled_pages
WHERE url LIKE '%twilio.com%'
AND content = '403 ERROR #'
LIMIT 10;

-- Check source records for Twilio
SELECT
    source_id,
    source_url,
    source_display_name,
    total_word_count,
    created_at
FROM archon_sources
WHERE source_url LIKE '%twilio%'
OR source_display_name LIKE '%Twilio%';

-- ================================================
-- STEP 2: CLEAN UP BAD DATA
-- ================================================

-- Delete all 403 error pages for Twilio
DELETE FROM archon_crawled_pages
WHERE content = '403 ERROR #'
AND url LIKE '%twilio.com%';

-- Delete failed Twilio source records (those with no content)
DELETE FROM archon_sources
WHERE source_url LIKE '%twilio.com%'
AND (total_word_count = 0 OR total_word_count IS NULL);

-- Clean up any orphaned embeddings for deleted Twilio pages
DELETE FROM archon_embeddings
WHERE source_id IN (
    SELECT source_id
    FROM archon_sources
    WHERE source_url LIKE '%twilio.com%'
    AND total_word_count = 0
);

-- Clean up code examples from failed crawls
DELETE FROM archon_code_examples
WHERE source_id IN (
    SELECT source_id
    FROM archon_sources
    WHERE source_url LIKE '%twilio.com%'
    AND total_word_count = 0
);

-- ================================================
-- STEP 3: VERIFY OUR UPLOADED GUIDES
-- ================================================

-- Check our manually uploaded Twilio documentation
SELECT
    source_id,
    source_display_name,
    total_word_count,
    created_at
FROM archon_sources
WHERE (
    source_display_name LIKE '%Twilio%Implementation%'
    OR source_display_name LIKE '%TWILIO%'
    OR source_display_name LIKE '%Voice%Assistant%'
    OR source_display_name LIKE '%E-Sign%'
    OR source_display_name LIKE '%ElevenLabs%'
)
ORDER BY created_at DESC;

-- Verify our guides have content
SELECT
    cp.source_id,
    s.source_display_name,
    COUNT(*) as chunk_count,
    SUM(LENGTH(cp.content)) as total_content_length
FROM archon_crawled_pages cp
JOIN archon_sources s ON cp.source_id = s.source_id
WHERE s.source_display_name LIKE '%Implementation%'
OR s.source_display_name LIKE '%Guide%'
GROUP BY cp.source_id, s.source_display_name
ORDER BY s.created_at DESC;

-- ================================================
-- STEP 4: CHECK ELEVENLABS STATUS
-- ================================================

-- Check if ElevenLabs crawled successfully
SELECT
    source_id,
    source_url,
    source_display_name,
    total_word_count,
    created_at
FROM archon_sources
WHERE source_url LIKE '%elevenlabs%'
OR source_display_name LIKE '%ElevenLabs%'
OR source_display_name LIKE '%Eleven Labs%';

-- ================================================
-- STEP 5: FINAL VERIFICATION
-- ================================================

-- Count remaining pages by domain after cleanup
SELECT
    CASE
        WHEN url LIKE '%twilio.com%' THEN 'Twilio'
        WHEN url LIKE '%elevenlabs%' THEN 'ElevenLabs'
        WHEN source_display_name LIKE '%Implementation%' THEN 'Our Guides'
        ELSE 'Other'
    END as content_type,
    COUNT(*) as page_count,
    SUM(LENGTH(content)) as total_content
FROM archon_crawled_pages
GROUP BY content_type
ORDER BY page_count DESC;

-- Test search functionality
-- Try searching for Twilio content to ensure our guides are searchable
SELECT
    source_display_name,
    content,
    LENGTH(content) as content_length
FROM archon_crawled_pages
WHERE content ILIKE '%twilio%'
AND content != '403 ERROR #'
LIMIT 5;

-- ================================================
-- OPTIONAL: IF YOU WANT TO RE-CRAWL SPECIFIC PAGES
-- ================================================

-- First, remove old attempts for specific pages you want to re-crawl
-- Example: Remove old SMS quickstart page
DELETE FROM archon_crawled_pages
WHERE url = 'https://www.twilio.com/docs/sms/quickstart';

-- Then you can try crawling individual pages through the Archon UI
-- Focus on these key pages:
-- 1. https://www.twilio.com/docs/sms/quickstart/node
-- 2. https://www.twilio.com/docs/voice/make-calls
-- 3. https://www.twilio.com/docs/voice/api/recording

-- ================================================
-- SUMMARY QUERY - RUN THIS LAST
-- ================================================

-- Get final summary of knowledge base
SELECT
    'Total Sources' as metric,
    COUNT(*) as value
FROM archon_sources
WHERE total_word_count > 0

UNION ALL

SELECT
    'Total Pages' as metric,
    COUNT(*) as value
FROM archon_crawled_pages
WHERE content != '403 ERROR #'

UNION ALL

SELECT
    'Failed Pages' as metric,
    COUNT(*) as value
FROM archon_crawled_pages
WHERE content = '403 ERROR #'

UNION ALL

SELECT
    'Our Guides' as metric,
    COUNT(DISTINCT source_id) as value
FROM archon_sources
WHERE source_display_name LIKE '%Implementation%'
OR source_display_name LIKE '%Guide%';

-- ================================================
-- NOTES:
-- ================================================
-- 1. Run these queries in order
-- 2. The DELETE queries will remove all 403 error records
-- 3. Our uploaded guides should remain intact
-- 4. After cleanup, Archon search should work better
-- 5. We're keeping ElevenLabs data (it crawled successfully)
-- ================================================
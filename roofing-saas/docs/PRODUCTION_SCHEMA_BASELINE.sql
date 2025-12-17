-- PRODUCTION SCHEMA BASELINE
-- Generated on: December 16, 2025
-- Purpose: Reference snapshot of production database schema
-- Source: Migration audit and production inventory
-- Project: wfifizczqvogbcqamnmw (Cloud RAG Agent Demo)
-- Status: READ-ONLY BASELINE (NOT TO BE APPLIED AS MIGRATION)

-- =====================================================================
-- IMPORTANT: This is a BASELINE REFERENCE document, NOT a migration
-- This documents the current production schema state for reference
-- DO NOT apply this as a migration - it documents existing schema
-- =====================================================================

-- DATABASE STATISTICS
-- Total Tables: 102 (as of December 16, 2025)
-- Active Business Tables: 62
-- Orphaned/Unused Tables: 40
-- Migration Tracking Status: 54 APPLIED_UNTRACKED, 3 PENDING

-- =====================================================================
-- CORE BUSINESS TABLES (62 actively used)
-- =====================================================================

-- CONTACTS & CUSTOMER MANAGEMENT
-- contacts - Primary customer/lead records
-- organizations - Merged into contacts (20251119000600_merge_organizations_into_contacts.sql)
-- activities - Customer interaction history
-- pipeline_stages - Sales pipeline configuration

-- COMMUNICATION SYSTEMS
-- sms_conversations - SMS conversation threads
-- sms_messages - Individual SMS messages
-- email_templates - Email campaign templates

-- CAMPAIGN MANAGEMENT (November 2025 refactor)
-- campaigns - Marketing campaign definitions
-- campaign_steps - Individual campaign step configurations
-- campaign_enrollments - Customer campaign participation

-- SALES & OPERATIONS
-- call_logs - Phone call records
-- tasks - Task management system
-- knocks - Door-to-door activity tracking
-- territories - Geographic territory management
-- rep_locations - Sales rep location tracking

-- PROJECT & JOB MANAGEMENT
-- projects - Roofing project records
-- jobs - Individual job instances
-- job_expenses - Job cost tracking
-- crew_members - Crew assignment and management
-- timesheets - Time tracking for jobs

-- DOCUMENT & MEDIA MANAGEMENT
-- photos - Photo attachments and metadata
-- documents - Document storage and references
-- signatures - E-signature system
-- signature_documents - Signature document templates

-- TENANT & USER MANAGEMENT
-- tenants - Multi-tenant organization management
-- tenant_users - User-tenant relationship mapping
-- user_sessions - User session tracking
-- login_activity - Authentication audit log

-- WEATHER & STORM TARGETING (November 2025)
-- storms - Weather event records
-- storm_events - Individual storm occurrences
-- storm_targeting_areas - Geographic storm impact zones

-- AI & VOICE SYSTEMS (October-December 2025)
-- voice_sessions - Voice AI conversation sessions
-- voice_function_calls - Voice AI function execution log
-- aria_conversations - AI conversation history

-- FILTERING & CONFIGURATION (November 2025)
-- filters - Dynamic filter definitions
-- filter_presets - Saved filter configurations
-- substatus_configs - Configurable substatus system

-- ADMIN & NOTIFICATIONS (December 2025)
-- admin_sessions - Admin impersonation tracking
-- notification_preferences - User notification settings

-- QUOTING SYSTEM (December 2025 - PENDING migration status)
-- quote_options - Quote configuration options
-- quote_line_items - Individual quote line items
-- quote_proposals - Complete quote proposals

-- BUSINESS INTELLIGENCE (December 2025 - PENDING migration status)
-- query_history - BI query execution history

-- =====================================================================
-- ORPHANED TABLES (40 unused - candidates for cleanup)
-- =====================================================================

-- KNOWLEDGE BASE SYSTEM (unused)
-- building_codes, carrier_standards, manufacturer_directory
-- manufacturer_specs, shingle_products, industry_organizations
-- industry_standards, insurance_carriers, insurance_personnel
-- court_cases

-- GAMIFICATION SYSTEM (old/unused)
-- achievements, challenges, user_achievements, user_challenges
-- user_points, user_streaks, gamification_activities, point_rules

-- CLAIMS SYSTEM (partially implemented)
-- claim_communications, claim_documents, claim_supplements
-- claim_weather_data

-- OTHER UNUSED FEATURES
-- automations, campaign_analytics, campaign_triggers
-- commission_rules, commissions, quickbooks_connections
-- email_drafts, report_schedules, task_attachments
-- task_comments, win_loss_reasons, n8n_chat_histories
-- kpi_snapshots, _encryption_keys

-- =====================================================================
-- BACKUP TABLES (cleanup candidates)
-- =====================================================================
-- contacts_backup_20251119 (27 days old)
-- organizations_backup_20251119 (27 days old)
-- projects_backup_20251119 (27 days old)

-- =====================================================================
-- MIGRATION STATUS SUMMARY
-- =====================================================================

-- APPLIED_UNTRACKED (54 migrations) - Schema exists but tracking out of sync
-- These migrations have been applied to production but CLI shows them as untracked
-- Requires: supabase migration repair commands to fix tracking metadata

-- Key Applied Systems:
-- - Base tables and voice assistant (October 2025)
-- - Storm targeting and pin dropping (November 2025)
-- - Organizations merge and campaigns refactor (November 2025)
-- - Recent optimizations and features (December 2025)

-- PENDING (3 migrations) - Not yet applied to production
-- 20251214210000_quote_options_system.sql - Quote system tables
-- 20251215000000_business_intelligence_system.sql - BI query history
-- [Third pending to be determined from migration list]

-- NEXT STEPS (from migration audit):
-- 1. Fix migration tracking with 'supabase migration repair' commands
-- 2. Apply pending migrations if needed (tables may already exist)
-- 3. Fix broken code references (27 identified)
-- 4. Generate fresh database types from current production schema

-- =====================================================================
-- SCHEMA EVOLUTION TIMELINE
-- =====================================================================

-- Phase 1: Core Setup (Pre-migrations)
-- - Base tables: contacts, projects, activities, tenant system

-- Phase 2: October 2025 Migration Burst
-- - Voice assistant, organizations, tasks, project files
-- - Territories, knocks, jobs, events, surveys
-- - Job costing, QuickBooks integration, knowledge base
-- - Gamification and commission systems

-- Phase 3: November 2025 Major Refactor
-- - Storm targeting system
-- - Organizations merged into contacts
-- - Campaign system complete overhaul
-- - Dynamic filters and substatus configuration

-- Phase 4: December 2025 Polish & Features
-- - Encryption improvements and performance optimization
-- - Incentives, notifications, user session management
-- - E-signature enhancements and compliance
-- - Quote options and business intelligence

-- =====================================================================
-- IMPORTANT NOTES FOR MIGRATION REPAIR
-- =====================================================================

-- 1. This baseline documents EXISTING schema - do not apply as migration
-- 2. Production schema is functional - only tracking metadata needs repair
-- 3. Focus on syncing migration status, not changing schema
-- 4. Verify pending migrations don't conflict with existing tables
-- 5. Generate fresh database.types.ts after repair is complete

-- END OF PRODUCTION SCHEMA BASELINE
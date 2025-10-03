# Documentation Index

This directory contains organized documentation for the Roofing SaaS project.

## 📁 Directory Structure

### `/imports/` - Data Migration & Import Guides
Documentation related to importing data from legacy systems (Proline, Enzy).

- **PROLINE_EXPLORATION_REPORT.md** - Analysis of Proline CRM data structure
- **ENZY_EXPLORATION_REPORT.md** - Analysis of Enzy door-knocking app data
- **ENZY_IMPORT_GUIDE.md** - Step-by-step guide for importing Enzy data
- **ADD_PROLINE_ID_MIGRATION.sql** - SQL migration for Proline ID mapping
- **DEPLOY_MIGRATION.md** - General migration deployment guide

### `/deployment/` - Production Setup & Configuration
Guides for setting up and deploying the application.

- **DATABASE_SETUP.md** - Database initialization and configuration
- **PENDING_SETUP.md** - Outstanding setup tasks and configuration items

### `/sessions/` - Development Session Logs
Historical records of development sessions, phase completions, and progress reports.

- **PHASE1_COMPLETE.md** - Phase 1 (Core CRM) completion report
- **PHASE_2_COMPLETE.md** - Phase 2 (Communication Hub) completion report
- **PHASE_3_PREP.md** - Phase 3 preparation and planning
- **PHASE_3_SESSION_STATUS.md** - Ongoing Phase 3 status updates
- **SESSION_STATUS_20251001.md** - Session snapshot from Oct 1, 2025
- **SESSION_SUMMARY_2025-01-02.md** - Session summary from Oct 2, 2025
- **SESSION_RESTART_GUIDE.md** - Guide for resuming work after breaks
- **RESTART_CHECKLIST.md** - Quick checklist for session restarts
- **ARCHITECTURE_IMPROVEMENTS.md** - Architectural decisions and improvements
- **IMPROVEMENTS_SUMMARY.md** - Summary of key improvements made

### `/integrations/` - Third-Party Service Integration
Documentation for external service integrations.

- **QUICKBOOKS_INTEGRATION.md** - QuickBooks API integration guide
- **TWILIO_SMS_INTEGRATION_RESEARCH.md** - Twilio SMS implementation research

### `/reference/` - Technical Reference
Technical documentation, troubleshooting guides, and best practices.

- **VALIDATION.md** - Testing and validation procedures
- **TROUBLESHOOTING.md** - Common issues and solutions
- **RLS_FIX_SUMMARY.md** - Row Level Security fixes and patterns

### `/archive/` - Completed/Historical Documentation
Archived documentation for completed setup tasks and resolved issues.

- **DEDUPLICATION_SETUP_GUIDE.md** - Contact deduplication implementation
- **EMAIL_DOMAIN_SETUP_COMPLETE.md** - Email domain configuration (completed)
- **NETLIFY_SSL_FIX_COMPLETE.md** - SSL certificate setup (completed)
- **SMS_TESTING_GUIDE.md** - SMS functionality testing procedures
- **SUPABASE_STORAGE_SETUP.md** - Supabase storage bucket configuration
- **TERRITORY_TROUBLESHOOTING.md** - Territory feature debugging

## 🔍 Quick Links by Task

### Setting Up Development Environment
1. Start with: `/deployment/DATABASE_SETUP.md`
2. Check: `/deployment/PENDING_SETUP.md`
3. Reference: `/sessions/SESSION_RESTART_GUIDE.md`

### Importing Legacy Data
1. Review: `/imports/PROLINE_EXPLORATION_REPORT.md`
2. Review: `/imports/ENZY_EXPLORATION_REPORT.md`
3. Follow: `/imports/ENZY_IMPORT_GUIDE.md`
4. Execute: `/imports/ADD_PROLINE_ID_MIGRATION.sql`

### Troubleshooting Issues
1. Check: `/reference/TROUBLESHOOTING.md`
2. Review: `/reference/VALIDATION.md`
3. Search: `/archive/` for similar completed issues

### Understanding Current Status
1. Latest: `/sessions/PHASE_2_COMPLETE.md`
2. Current: `/sessions/PHASE_3_SESSION_STATUS.md`
3. Active: See root `ITEMS_TO_CIRCLE_BACK.md`

### Integration Development
1. QuickBooks: `/integrations/QUICKBOOKS_INTEGRATION.md`
2. Twilio SMS: `/integrations/TWILIO_SMS_INTEGRATION_RESEARCH.md`

## 📝 Document Naming Conventions

- `*_COMPLETE.md` - Completed tasks or implementations
- `*_REPORT.md` - Analysis or summary reports
- `*_GUIDE.md` - Step-by-step instructions
- `*_STATUS.md` - Current status snapshots
- `SESSION_*.md` - Development session logs
- `PHASE*.md` - Phase-related documentation

## 🔄 Maintenance

- Active session logs go in `/sessions/`
- Completed setup tasks move to `/archive/`
- Integration research goes in `/integrations/`
- Production guides stay in `/deployment/`

---

**Last Updated**: October 2, 2025
**Maintained By**: AI-assisted development team

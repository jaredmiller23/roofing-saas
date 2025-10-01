# Database Configuration Guide

**Last Updated**: October 1, 2025
**Status**: CRITICAL REFERENCE - DO NOT MODIFY WITHOUT VERIFICATION

---

## 🚨 CRITICAL: Two Separate Supabase Projects

This project uses **TWO COMPLETELY SEPARATE** Supabase databases. Mixing them up could cause catastrophic data loss.

### Database 1: Archon Knowledge Base

**Purpose**: Development resources, documentation, code snippets
**Owner**: Development team (NOT client data)

- **Project Ref**: `pcduofjokergeakxgjpp`
- **Project URL**: `https://pcduofjokergeakxgjpp.supabase.co`
- **MCP Server Name**: `supabase-archon`
- **MCP Tools**: `mcp__supabase-archon__*`
- **Tables**: `archon_*` (projects, tasks, sources, code_examples, etc.)
- **Access Token**: `sbp_316a707ce3b1abdf40ca707c92c558cc06192d98`

**Used For**:
- Storing Archon project management data
- RAG knowledge base for development
- Code examples and documentation

### Database 2: Roofing SaaS (Client Database)

**Purpose**: Production client data - roofing company business operations
**Owner**: CLIENT (Tennessee roofing company)

- **Project Ref**: `wfifizczqvogbcqamnmw`
- **Project URL**: `https://wfifizczqvogbcqamnmw.supabase.co`
- **MCP Server Name**: `supabase-roofing`
- **MCP Tools**: `mcp__supabase-roofing__*`
- **Tables**: `tenants`, `contacts`, `projects`, `activities`, etc.
- **Access Token**: `sbp_af41de7a9b0a203312bbe8d727c0f223d05bd50f`

**Used For**:
- Client's CRM data
- Customer contacts and projects
- Business operations
- Financial data
- Voice AI sessions

---

## ⚙️ Configuration Files

### .env.local (Next.js Application)

```bash
# ROOFING CLIENT DATABASE (wfifizczqvogbcqamnmw)
NEXT_PUBLIC_SUPABASE_URL=https://wfifizczqvogbcqamnmw.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**✅ CORRECT**: Points to client's roofing database

### .mcp.json (MCP Server Configuration)

```json
{
  "mcpServers": {
    "supabase-archon": {
      "args": ["--project-ref=pcduofjokergeakxgjpp"],
      "description": "Archon knowledge base"
    },
    "supabase-roofing": {
      "args": ["--project-ref=wfifizczqvogbcqamnmw"],
      "description": "Roofing SaaS operational database"
    }
  }
}
```

**✅ FIXED**: Previously had wrong project ref `ibdajxguadfapmcxnogd`

---

## 🔍 Verification Checklist

Before deploying ANY database changes, verify:

### 1. Check Project URL
```bash
# Archon should show archon_* tables
mcp__supabase-archon__list_tables

# Roofing should show tenants, contacts, projects, etc.
mcp__supabase-roofing__list_tables
```

### 2. Verify .env.local
```bash
# Should contain wfifizczqvogbcqamnmw
grep SUPABASE_URL roofing-saas/.env.local
```

### 3. Verify .mcp.json
```bash
# Should show wfifizczqvogbcqamnmw for supabase-roofing
grep -A 5 "supabase-roofing" .mcp.json
```

---

## 📋 Database Schema Deployment

### For Roofing Client Database

**ALWAYS use `mcp__supabase-roofing__*` tools**

```bash
# ✅ CORRECT
mcp__supabase-roofing__list_tables
mcp__supabase-roofing__execute_sql
mcp__supabase-roofing__apply_migration

# ❌ WRONG - This is the Archon database!
mcp__supabase__list_tables
mcp__supabase-archon__execute_sql
```

### Schema File
- **Location**: `/Users/ccai/Roofing SaaS/DATABASE_SCHEMA_v2.sql`
- **Deploy To**: Roofing database (`wfifizczqvogbcqamnmw`)
- **Method**: MCP `apply_migration` or Supabase Dashboard SQL Editor

---

## ⚠️ Common Mistakes

### Mistake 1: Wrong MCP Server
```bash
# ❌ WRONG - Queries Archon database
mcp__supabase__list_tables

# ✅ CORRECT - Queries Roofing database
mcp__supabase-roofing__list_tables
```

### Mistake 2: Mismatched Project Refs
```json
// ❌ WRONG - .mcp.json had this before fix
"--project-ref=ibdajxguadfapmcxnogd"

// ✅ CORRECT - Now matches .env.local
"--project-ref=wfifizczqvogbcqamnmw"
```

### Mistake 3: Deploying to Wrong Database
**Always verify tables before executing migrations:**
```bash
# Check what you're about to modify
mcp__supabase-roofing__list_tables

# If you see archon_* tables, STOP! You're on the wrong database.
```

---

## 🎯 Quick Reference

| What | Archon | Roofing |
|------|--------|---------|
| Project Ref | `pcduofjokergeakxgjpp` | `wfifizczqvogbcqamnmw` |
| URL | `pcduofjokergeakxgjpp.supabase.co` | `wfifizczqvogbcqamnmw.supabase.co` |
| MCP Tools | `mcp__supabase-archon__*` | `mcp__supabase-roofing__*` |
| Tables Start With | `archon_*` | `tenants`, `contacts`, etc. |
| Purpose | Dev resources | Client production data |

---

## 🔧 Fixing Configuration Issues

If you discover a misconfiguration:

1. **STOP all database operations immediately**
2. **Verify current state** with `list_tables`
3. **Update .mcp.json** if needed
4. **Restart Claude Code** to reload MCP servers
5. **Verify fix** with `list_tables` again
6. **Document the fix** in this file

---

**Last Incident**: October 1, 2025
**Issue**: `.mcp.json` had wrong project ref (`ibdajxguadfapmcxnogd`) for roofing database
**Fix**: Updated to correct ref (`wfifizczqvogbcqamnmw`)
**Status**: ✅ Resolved

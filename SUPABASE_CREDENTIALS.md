# Supabase Credentials and Configuration
**Project**: Tennessee Roofing SaaS
**Last Updated**: September 29, 2025

## 🔐 Credentials

### Database Connection
- **Project ID**: `pcduofjokergeakxgjpp`
- **Database Password**: `sawked-bedri4-hIkxih`
- **Database Name**: `postgres`
- **Username**: `postgres`

### Connection Strings
```bash
# Direct connection (port 5432)
postgresql://postgres:sawked-bedri4-hIkxih@db.pcduofjokergeakxgjpp.supabase.co:5432/postgres

# Pooled connection (port 6543) - for serverless/edge functions
postgresql://postgres:sawked-bedri4-hIkxih@db.pcduofjokergeakxgjpp.supabase.co:6543/postgres?pgbouncer=true

# Alternative pooler host (if above doesn't work)
postgresql://postgres.pcduofjokergeakxgjpp:sawked-bedri4-hIkxih@aws-0-us-west-1.pooler.supabase.com:5432/postgres
```

### API Keys
- **Anon (Public) Key**:
  ```
  eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjZHVvZmpva2VyZ2Vha3hnanBwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwMDAxODgsImV4cCI6MjA3NDU3NjE4OH0.YoJ49zSumQiUkp8uCDDT-aQbmaw5cDyH48MSadRpp2c
  ```

- **Service Role Key** (in Archon .env):
  ```
  eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjZHVvZmpva2VyZ2Vha3hnanBwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTAwMDE4OCwiZXhwIjoyMDc0NTc2MTg4fQ.8Sqe9BmdBhRHHNTTA3cO8XdriTLgf2WXS_Iomctw5Vw
  ```

### URLs
- **API URL**: `https://pcduofjokergeakxgjpp.supabase.co`
- **Dashboard**: https://supabase.com/dashboard/project/pcduofjokergeakxgjpp

## 🔧 Postgres MCP Configuration

### Current Setup
The Postgres MCP server is configured in Claude Code at:
- **Command**: `/Users/ccai/mcp-servers/postgres-mcp/.venv/bin/postgres-mcp`
- **Access Mode**: `unrestricted` (full read/write for development)

### How to Verify/Update
```bash
# Check current configuration
claude mcp list

# Remove if needed
claude mcp remove supabase-postgres

# Re-add with correct credentials
claude mcp add supabase-postgres \
  "/Users/ccai/mcp-servers/postgres-mcp/.venv/bin/postgres-mcp" \
  -e "DATABASE_URI=postgresql://postgres:sawked-bedri4-hIkxih@db.pcduofjokergeakxgjpp.supabase.co:5432/postgres" \
  -- --access-mode=unrestricted
```

## 🚀 Next.js Project Configuration

When setting up the Next.js project, use these environment variables:

```env
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://pcduofjokergeakxgjpp.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjZHVvZmpva2VyZ2Vha3hnanBwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwMDAxODgsImV4cCI6MjA3NDU3NjE4OH0.YoJ49zSumQiUkp8uCDDT-aQbmaw5cDyH48MSadRpp2c

# Only for server-side operations (keep secure!)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjZHVvZmpva2VyZ2Vha3hnanBwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTAwMDE4OCwiZXhwIjoyMDc0NTc2MTg4fQ.8Sqe9BmdBhRHHNTTA3cO8XdriTLgf2WXS_Iomctw5Vw

# Direct database connection (for migrations/scripts only)
DATABASE_URL=postgresql://postgres:sawked-bedri4-hIkxih@db.pcduofjokergeakxgjpp.supabase.co:5432/postgres
```

## 🔒 Security Notes

⚠️ **NEVER commit this file to git!** Add to `.gitignore`:
```gitignore
SUPABASE_CREDENTIALS.md
.env.local
.env*.local
```

## 🧪 Testing Connection

### Via psql (if installed)
```bash
psql "postgresql://postgres:sawked-bedri4-hIkxih@db.pcduofjokergeakxgjpp.supabase.co:5432/postgres" -c "SELECT version();"
```

### Via Node.js
```javascript
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  'https://pcduofjokergeakxgjpp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjZHVvZmpva2VyZ2Vha3hnanBwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwMDAxODgsImV4cCI6MjA3NDU3NjE4OH0.YoJ49zSumQiUkp8uCDDT-aQbmaw5cDyH48MSadRpp2c'
)

// Test connection
async function test() {
  const { data, error } = await supabase.from('_schema').select('*').limit(1)
  if (error) console.error('Error:', error)
  else console.log('Connection successful!')
}
test()
```

## 📝 Related Files
- `/Users/ccai/archon/.env` - Archon's Supabase configuration
- `/Users/ccai/.claude.json` - Claude Code MCP configuration
- `/Users/ccai/Roofing SaaS/SESSION_CONTEXT_RESTART.md` - Session context
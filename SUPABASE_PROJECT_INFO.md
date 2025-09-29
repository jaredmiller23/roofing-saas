# Supabase Project Information for Roofing SaaS

## Project Details

- **Project URL**: `https://ibdajxguadfapmcxnogd.supabase.co`
- **Project ID**: `ibdajxguadfapmcxnogd`
- **Region**: US East 2 (Ohio)

## Database Connection

### Connection Pooler (Recommended for serverless)
- **Host**: `aws-1-us-east-2.pooler.supabase.com`
- **Port**: `6543`
- **Database**: `postgres`
- **User**: `postgres.ibdajxguadfapmcxnogd`
- **Password**: `mijgyf-domfe4-zeVbeb`

### Direct Connection (For migrations)
- **Host**: `db.ibdajxguadfapmcxnogd.supabase.co`
- **Port**: `5432`
- **Database**: `postgres`
- **User**: `postgres`
- **Password**: `mijgyf-domfe4-zeVbeb`

## Connection Strings

### Pooled Connection (for application)
```
postgresql://postgres.ibdajxguadfapmcxnogd:mijgyf-domfe4-zeVbeb@aws-1-us-east-2.pooler.supabase.com:6543/postgres
```

### Direct Connection (for migrations)
```
postgresql://postgres:mijgyf-domfe4-zeVbeb@db.ibdajxguadfapmcxnogd.supabase.co:5432/postgres
```

## ⚠️ Important Security Notes

1. **NEVER commit this file to git** - It's already in .gitignore
2. **Get API keys from Supabase Dashboard**:
   - Go to Settings > API
   - Copy the `anon` key for NEXT_PUBLIC_SUPABASE_ANON_KEY
   - Copy the `service_role` key for SUPABASE_SERVICE_ROLE_KEY
3. **Use environment variables** in production
4. **Rotate credentials** if exposed

## MCP Configuration Issue

The MCP server connection might be failing because:
1. The project URL format might have changed
2. The access token might be invalid
3. The project might not have the correct permissions

To fix the supabase-roofing MCP connection:
```bash
# Remove old configuration
claude mcp remove supabase-roofing -s local

# Re-add with correct credentials (need to get the access token)
claude mcp add -e SUPABASE_ACCESS_TOKEN=your_actual_token -- supabase-roofing npx -y @supabase/mcp-server-supabase@latest --project-ref=ibdajxguadfapmcxnogd
```

## Next Steps

1. **Get API Keys**: Log into Supabase Dashboard and get the anon and service_role keys
2. **Create .env.local**: Copy .env.example to .env.local and fill in the keys
3. **Initialize Database**: Run migrations to set up tables
4. **Test Connection**: Verify the connection works with the Supabase client

## Database Schema Setup

Once connected, we need to create these tables for the MVP:
- `contacts` - Leads and customers
- `projects` - Jobs/deals
- `activities` - All interactions
- `users` - Via Supabase Auth
- `gamification` - Points and achievements
- `communications` - SMS/Email logs
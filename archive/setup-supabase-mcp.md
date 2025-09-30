# Setting Up Postgres MCP for Supabase Access

## Status
✅ Postgres MCP is installed at: `/Users/ccai/mcp-servers/postgres-mcp/`
✅ Virtual environment created and packages installed

## Next Steps to Enable Database Access

### 1. Get Your Supabase Database Password

1. Go to: https://supabase.com/dashboard/project/pcduofjokergeakxgjpp/settings/database
2. Scroll to "Connection string" section
3. Copy the password (it's hidden by default, click to reveal)
4. **Important**: You need the database password, NOT the service role key

### 2. Add MCP Server to Claude Code

Run this command, replacing `[PASSWORD]` with your actual database password:

```bash
claude mcp add supabase-postgres \
  --command "/Users/ccai/mcp-servers/postgres-mcp/.venv/bin/postgres-mcp" \
  --args "--access-mode=unrestricted" \
  --env "DATABASE_URI=postgresql://postgres.pcduofjokergeakxgjpp:[PASSWORD]@aws-0-us-west-1.pooler.supabase.com:5432/postgres"
```

### 3. Alternative: Manual Configuration

If the above doesn't work, manually edit the Claude Code MCP config:

```bash
# Find your Claude Code config location
claude mcp list --show-config-path

# Edit the config file and add:
```

```json
{
  "mcpServers": {
    "supabase-postgres": {
      "command": "/Users/ccai/mcp-servers/postgres-mcp/.venv/bin/postgres-mcp",
      "args": ["--access-mode=unrestricted"],
      "env": {
        "DATABASE_URI": "postgresql://postgres.pcduofjokergeakxgjpp:[PASSWORD]@aws-0-us-west-1.pooler.supabase.com:5432/postgres"
      }
    }
  }
}
```

### 4. Test the Connection

After configuration, restart Claude Code and test with:
- The MCP tools should appear in the available tools list
- Try a simple query like listing tables

## Connection Details

- **Project ID**: pcduofjokergeakxgjpp
- **Host**: aws-0-us-west-1.pooler.supabase.com
- **Port**: 5432
- **Database**: postgres
- **User**: postgres.pcduofjokergeakxgjpp
- **Password**: [Get from Supabase Dashboard]

## Access Modes

- `--access-mode=unrestricted` - Full read/write access (development)
- `--access-mode=readonly` - Read-only access (safer for production)
- `--access-mode=custom` - Custom restrictions via config

## Troubleshooting

If connection fails:
1. Verify password is correct
2. Check if IP is whitelisted in Supabase (usually not needed)
3. Try the direct connection: `aws-0-us-west-1.pooler.supabase.com:6543` (direct port)
4. Check Archon's connection (it's working, so we know the database is accessible)

## Security Note

⚠️ **Never commit the DATABASE_URI with password to git!**
- Use environment variables
- Or store in secure config files outside the repo
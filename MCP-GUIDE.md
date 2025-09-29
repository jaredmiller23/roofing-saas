# MCP Server Configuration Guide for Roofing SaaS

## 🚀 Overview

This guide documents the Model Context Protocol (MCP) server configuration for the Roofing SaaS platform. MCP servers extend Claude Code's capabilities to interact with external services, databases, and APIs.

## ⚠️ Critical Understanding: How Claude Code Uses MCP Configurations

**Claude Code v2.0.0 Configuration Hierarchy:**

1. **`~/.claude.json`** - ✅ **ACTIVE** (What Claude Code actually uses)
   - Project-specific configurations stored under project paths
   - Modified via `claude mcp add/remove` commands

2. **`.mcp.json` files** - 📝 **DOCUMENTATION ONLY**
   - Project-level `.mcp.json` - For reference/sharing
   - User-level `~/.mcp.json` - Ignored by Claude Code
   - These files are NOT automatically loaded unless explicitly imported

## 🔧 Current MCP Server Configuration

As of September 29, 2025, these MCP servers are configured for the project:

### ✅ Active & Working Servers

| Server | Purpose | Status | Configuration |
|--------|---------|--------|---------------|
| **archon** | Knowledge base & task management | ✅ Connected | HTTP at localhost:8051 |
| **supabase** | Archon knowledge database | ✅ Connected | Project: pcduofjokergeakxgjpp |
| **n8n-cloud** | Workflow automation | ✅ Connected | 79 workflows available |
| **filesystem** | File operations | ✅ Connected | Access to /Users/ccai |
| **fetch** | REST API calls | ✅ Connected | Handles all HTTP requests |
| **notion** | Documentation management | ✅ Connected | Via npx package |
| **git** | Version control | ✅ Connected | Repository initialized |

### ⚠️ Servers Needing Configuration

| Server | Purpose | Issue | Action Required |
|--------|---------|-------|-----------------|
| **supabase-roofing** | App database | Invalid project ref | Create Supabase project & update credentials |
| **postgres-local** | Local database | No credentials | Set DATABASE_URL when needed |
| **google-sheets** | Reporting | No credentials | Add Google service account |

## 📋 Integration Mapping

Based on the PRD requirements, here's how each integration is handled:

### Phase 1-2: Core Integrations

| Integration | MCP Server | Alternative | Priority |
|-------------|------------|-------------|----------|
| **QuickBooks** | fetch | n8n workflow | Critical |
| **Twilio SMS** | fetch | n8n workflow | Critical |
| **Email (Resend/SendGrid)** | fetch | Supabase Edge Functions | High |
| **DocuSign** | fetch | n8n workflow | Medium |

### Phase 3-5: Advanced Integrations

| Integration | MCP Server | Alternative | Priority |
|-------------|------------|-------------|----------|
| **OpenAI** | fetch | Direct API calls | Medium |
| **Maps (Google/Mapbox)** | fetch | Client-side SDK | Medium |
| **Stripe** | fetch | n8n workflow | Low |
| **ElevenLabs (Voice)** | fetch | Edge Functions | Low |

## 🛠 How to Add/Remove MCP Servers

### Adding a New MCP Server

```bash
# Basic syntax
claude mcp add [server-name] -- [command] [args]

# With environment variables
claude mcp add -e KEY=value -- [server-name] [command] [args]

# HTTP/SSE servers
claude mcp add --transport http [server-name] [url]

# Examples:
claude mcp add fetch -- uv tool run mcp-server-fetch
claude mcp add -e NOTION_API_KEY=secret -- notion npx -y @modelcontextprotocol/server-notion@latest
claude mcp add --transport http archon http://localhost:8051/mcp
```

### Removing an MCP Server

```bash
# Remove from local (Claude) configuration
claude mcp remove [server-name] -s local

# Remove from project .mcp.json (documentation only)
claude mcp remove [server-name] -s project

# Check what's configured
claude mcp list
```

## 🔑 Required Credentials

### Immediate Needs (Phase 1-2)

1. **Supabase Roofing Database**
   - Create project at supabase.com
   - Get project reference and service key
   - Update supabase-roofing MCP configuration

2. **QuickBooks OAuth**
   - Register app at developer.intuit.com
   - Get Client ID and Secret
   - Configure OAuth flow in app

3. **Twilio**
   - Get Account SID and Auth Token
   - Configure phone numbers
   - Set up messaging service

### Future Needs (Phase 3+)

- Google Service Account (for Sheets API)
- OpenAI API Key
- Google Maps API Key or Mapbox Token
- Stripe API Keys
- DocuSign Integration Key

## 📂 Using MCP Servers in Development

### fetch MCP for API Integrations

The `fetch` MCP server is your primary tool for all REST API integrations:

```typescript
// Example: QuickBooks API call via fetch MCP
// Use mcp__fetch__* tools in Claude Code

// Example: Twilio SMS via fetch MCP
// POST to https://api.twilio.com/2010-04-01/Accounts/{AccountSid}/Messages
```

### n8n Workflows for Complex Automations

For complex multi-step integrations, use n8n workflows:

1. **QuickBooks Sync**: Workflow for invoice/customer sync
2. **Twilio Campaigns**: Bulk SMS with templates
3. **Email Automation**: Drip campaigns with Resend/SendGrid
4. **Document Processing**: DocuSign envelope management

### Archon for Knowledge & Tasks

Use Archon MCP tools for:
- RAG searches: `mcp__archon__rag_search_knowledge_base`
- Task management: `mcp__archon__manage_task`
- Project tracking: `mcp__archon__find_projects`

## 🚨 Common Issues & Solutions

### Issue: "MCP server not found"
**Solution**: Servers must be added via `claude mcp add`, not by editing .mcp.json

### Issue: "supabase-roofing timeout"
**Solution**: The project reference doesn't exist. Create a new Supabase project first.

### Issue: "fetch MCP not working"
**Solution**: Ensure you're in the correct directory or use full paths in the command.

### Issue: "Multiple scopes error"
**Solution**: Use `-s local` flag to specify you want to modify Claude's config.

## 📝 Best Practices

1. **Use fetch MCP for all REST APIs** - Don't create separate MCPs for each service
2. **Leverage n8n for complex workflows** - Better than coding everything
3. **Keep credentials in environment variables** - Never commit secrets
4. **Document server purposes** - Update this guide when adding servers
5. **Test connections after adding** - Use `claude mcp list` to verify

## 🔄 Next Steps

1. **Create Supabase roofing project** and update credentials
2. **Set up QuickBooks OAuth** application
3. **Configure Twilio** account and phone numbers
4. **Create n8n workflows** for each integration
5. **Add API credentials** as they become available

## 📊 Configuration Status Summary

- ✅ **Core Development**: Git, filesystem, fetch configured
- ✅ **Knowledge Base**: Archon connected and working
- ✅ **Automation**: n8n-cloud with 79 workflows
- ⚠️ **App Database**: Needs Supabase project creation
- 🔄 **API Integrations**: Ready via fetch MCP
- 📝 **Documentation**: Notion MCP added

---

*Last Updated: September 29, 2025*
*Claude Code Version: 2.0.0*
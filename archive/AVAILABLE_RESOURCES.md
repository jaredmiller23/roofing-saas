# Available Resources Directory

**Purpose**: Quick reference for Claude instances to know what tools/repositories exist without re-scanning the entire system.

**Last Updated**: September 29, 2025

---

## 🎯 PRIMARY RESOURCES (Currently In Use)

### Archon
- **Location**: `/Users/ccai/archon`
- **Purpose**: Knowledge base and task management system with MCP server
- **Status**: ✅ INTEGRATED - Running at http://localhost:3737
- **Use For**: Documentation storage, task tracking, RAG queries
- **MCP**: Connected at http://localhost:8051/mcp

---

## 🛠️ AVAILABLE IF NEEDED

### Postgres MCP Pro
- **Location**: `/Users/ccai/mcp-servers/postgres-mcp`
- **Purpose**: Advanced PostgreSQL optimization, index tuning, query analysis
- **When To Use**: Database performance issues, index optimization, query plan analysis
- **How To Add**: `claude mcp add --transport stdio postgres-mcp "python -m postgres_mcp"`

### MCP Crawl4AI RAG
- **Location**: `/Users/ccai/mcp-crawl4ai-rag`
- **Purpose**: Web crawling and RAG with Supabase vector storage
- **When To Use**: Need to crawl extensive documentation (e.g., competitor analysis)
- **Note**: Archon already provides RAG; only use if need specialized crawling

---

## 📦 AVAILABLE BUT NOT ALIGNED WITH PROJECT

### local-ai-packaged
- **Location**: `/Users/ccai/local-ai-packaged`
- **What It Is**: Docker compose with n8n, Ollama, Supabase, Open WebUI
- **Why NOT Using**: We chose Next.js + Supabase, not n8n workflow approach
- **Could Be Useful For**: Reference for Supabase docker setup only

### n8n-mcp-server
- **Location**: `/Users/ccai/n8n-mcp-server`
- **What It Is**: MCP server for n8n workflow automation
- **Why NOT Using**: We're building native Next.js features, not using n8n
- **Could Be Useful For**: Never - wrong tech stack

### ottomator-agents
- **Location**: `/Users/ccai/ottomator-agents`
- **What It Is**: Collection of n8n workflow agents
- **Why NOT Using**: These are n8n templates, not Next.js code
- **Could Be Useful For**: Conceptual reference only

### remote-mcp-server-with-auth
- **Location**: `/Users/ccai/remote-mcp-server-with-auth`
- **What It Is**: Production MCP server template with Cloudflare Workers
- **Why NOT Using**: We're building a SaaS app, not deploying MCP servers
- **Could Be Useful For**: If we ever need to create custom MCP servers

### Google Sheets MCP
- **Location**: `/Users/ccai/mcp-servers/google-sheets-mcp`
- **What It Is**: MCP server for Google Sheets integration
- **Why NOT Using**: Using QuickBooks for financial data, not Sheets
- **Could Be Useful For**: Quick data import/export if needed

### Slack MCP Server
- **Location**: `/Users/ccai/mcp-servers/slack-mcp-server`
- **What It Is**: MCP server for Slack integration
- **Why NOT Using**: Not in our requirements; using Twilio for communication
- **Could Be Useful For**: Future team communication features

---

## 📋 PROJECT-SPECIFIC RESOURCES

### Project Documentation
- **PRD**: `/Users/ccai/Roofing SaaS/PRD.md`
- **CLAUDE.md**: `/Users/ccai/Roofing SaaS/CLAUDE.md`
- **Archon Integration**: `/Users/ccai/Roofing SaaS/ARCHON_INTEGRATION.md`

### Knowledge Base Files
- **Technical KB**: `/Users/ccai/knowledge_base_roofing_platform.md`
- **API Guide**: `/Users/ccai/roofing_industry_apis.md`

---

## 🚀 QUICK DECISION TREE

**Need to...**

1. **Find project documentation?** → Check Archon or project docs above
2. **Optimize database queries?** → Add postgres-mcp
3. **Crawl websites?** → Use Archon's built-in crawling first
4. **Add workflow automation?** → Build it in Next.js, don't use n8n
5. **Deploy MCP servers?** → We're not doing this - building a SaaS app
6. **Reference AI patterns?** → Check ottomator-agents for ideas only

---

## ⚠️ IMPORTANT REMINDERS

1. **Stick to the PRD** - We're building Next.js + Supabase, not exploring every tool
2. **Phase 1 First** - Core CRM functionality before anything fancy
3. **Archon Has RAG** - Don't add duplicate RAG tools
4. **Keep It Simple** - If you're considering adding a tool, check if we really need it

---

## 🔄 How to Update This Document

When new tools are added or removed:
1. Update this document
2. Upload new version to Archon knowledge base
3. Note the update date at the top

This directory ensures future Claude instances can quickly understand what's available without wasting time re-scanning repositories that aren't relevant to our roofing SaaS project.
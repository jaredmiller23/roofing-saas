# 🔄 Restart Checklist for Roofing SaaS Project

## Pre-Restart Status (Sept 29, 2025)

### ✅ MCP Servers Connected
- **supabase**: Archon knowledge base (pcduofjokergeakxgjpp) - ✓ Connected
- **supabase-roofing**: Roofing database (ibdajxguadfapmcxnogd) - ✓ Connected
- **archon**: Task management at localhost:8051 - ✓ Connected
- **n8n-cloud**: Workflow automation (79 workflows) - ✓ Connected
- **filesystem**: File operations at /Users/ccai - ✓ Connected

### 🔧 After Restart - Quick Setup

```bash
# 1. Start Archon (if not running)
cd /Users/ccai/archon && docker compose up -d

# 2. Verify Archon is healthy
curl http://localhost:8051/health

# 3. Check MCP connections
claude mcp list

# 4. If any MCP servers are disconnected, they're already configured
# Just restart Claude Code and they should reconnect
```

### 🎯 Current Project Context

**Project**: Tennessee Roofing SaaS Platform
**Phase**: Phase 1 - Core CRM (Weeks 1-4)
**Status**: Setting up development environment

#### Key Files to Review:
- `/Users/ccai/Roofing SaaS/CLAUDE.md` - Project instructions
- `/Users/ccai/Roofing SaaS/PRD.md` - Product requirements
- `/Users/ccai/knowledge_base_roofing_platform.md` - Technical specs
- `/Users/ccai/roofing_industry_apis.md` - Integration details

#### MCP Configuration Issue (RESOLVED):
- Claude Code ignores `.mcp.json` files
- Must use `claude mcp add` commands
- All configs stored in `~/.claude.json` under project path
- 5 critical servers configured and working

### 📋 Active Archon Tasks
Check current tasks at: http://localhost:3737
Or use: `mcp__archon__find_tasks(filter_by="status", filter_value="todo")`

### 🚀 Next Steps After Restart
1. Verify all MCP connections are active
2. Check Archon for current tasks
3. Continue with Phase 1 implementation:
   - Database schema setup
   - Auth flow implementation
   - Basic CRUD for contacts
   - Pipeline view development

### ⚠️ Known Issues
- **git MCP**: Failed (project not a git repo yet)
- **time MCP**: Failed (package issue - not critical)

### 💡 Quick Commands
```bash
# View MCP status
claude mcp list

# Check Archon health
curl http://localhost:8051/health

# View Docker containers
docker ps | grep archon

# Check project structure
ls -la /Users/ccai/Roofing\ SaaS/
```

---
*Last updated: September 29, 2025 at system restart*
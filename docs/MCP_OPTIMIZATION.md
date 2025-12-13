# MCP Optimization Guide

## The Problem We Solved (December 13, 2025)

MCP (Model Context Protocol) servers were consuming **40.2% of context** (80.5k tokens) before any work could begin. This document explains what we did and how to manage MCPs going forward.

### Before Optimization
```
MCP tools: 80.5k tokens (40.2% of 200k context)
- 107 total tools across 7+ servers
- Many duplicate/redundant capabilities
- 20k+ tokens for rarely-used Playwright
- 14k tokens for duplicate Supabase instance
```

### After Phase 1 (December 13, 2025 AM)
```
MCP tools: ~12.5k tokens (~6% of context)
- Only Archon MCP remained
- 68k tokens freed for actual work
```

### After Phase 2 (December 13, 2025 PM) - COMPLETE
```
MCP tools: 0 tokens (0% of context)
- ALL MCPs removed
- Archon replaced with Skill + curl commands
- ~80k tokens freed total (40% → 0%)
```

## Current Configuration

**Active MCPs**: NONE (all removed)

**Archon Replacement**: Skill-based with curl
- Skill: `.claude/skills/archon/README.md`
- API: `http://localhost:8181/api`
- Zero token overhead (skills load contextually)

**Removed MCPs**:
| MCP | Tokens | Reason | Replacement |
|-----|--------|--------|-------------|
| filesystem | ~9k | Duplicates native tools | Read, Write, Edit, Glob, Grep |
| supabase | ~13k | Token overhead | Bash + curl, or edge functions |
| supabase-roofing | ~14k | Duplicate instance | Use env vars to switch projects |
| playwright | ~20k | E2E testing only | Add temporarily when testing |
| n8n-cloud | ~7k | Rarely used | Bash + curl to n8n API |
| ide | ~1.3k | Limited value | `npm run typecheck` via Bash |

## How to Add MCPs Back (If Needed)

### Temporarily for a Session
```bash
# Add playwright for E2E testing
claude mcp add playwright -s project -e npx -y @executeautomation/playwright-mcp-server

# Add supabase for database work
claude mcp add supabase -s project -- npx -y @supabase/mcp-server-supabase@latest --project-ref=wfifizczqvogbcqamnmw
```

### Permanently (for this project)
```bash
# Edit .mcp.json directly
code "/Users/ccai/Roofing SaaS/.mcp.json"
```

## Guidelines for Adding MCPs

Before adding an MCP, ask:

1. **Is it used in >50% of sessions?** - If not, add temporarily
2. **Can native tools replace it?** - Prefer Read/Write/Bash over MCPs
3. **What's the token cost?** - Target <5k tokens per MCP
4. **Does it provide unique value?** - MCPs should do what native tools can't

## Native Tool Replacements

### Instead of filesystem MCP:
```
Read file: Read tool
Write file: Write tool
Edit file: Edit tool
Find files: Glob tool
Search content: Grep tool
```

### Instead of supabase MCP:
```bash
# Direct SQL via curl
curl -X POST "${SUPABASE_URL}/rest/v1/rpc/function_name" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"param": "value"}'
```

### Instead of playwright MCP:
```bash
# Run E2E tests directly
npm run test:e2e
npx playwright test specific.spec.ts
```

## Context Window Best Practices

1. **Check context usage**: Run `/context` to see current allocation
2. **Compact early**: Run `/compact` at 80-85% before auto-compact
3. **Minimize loaded tools**: Only what you need for the session
4. **Use Skills over MCPs**: Skills load contextually, not upfront

## Archon (Skill-Based)

Archon is now accessed via curl commands documented in the Skill:
- **Skill location**: `.claude/skills/archon/README.md`
- **API endpoint**: `http://localhost:8181/api`
- **Token cost**: 0 tokens (skills load contextually, not upfront)

### Quick Reference
```bash
# List TODO tasks
curl -s "http://localhost:8181/api/tasks?status=todo" | jq

# Update task status
curl -X PUT http://localhost:8181/api/tasks/TASK_ID \
  -H "Content-Type: application/json" \
  -d '{"status": "doing"}'

# Create task
curl -X POST http://localhost:8181/api/tasks \
  -H "Content-Type: application/json" \
  -d '{"project_id":"...", "title":"...", "status":"todo"}'

# Health check
curl -s http://localhost:8181/health | jq
```

### Rollback (If Needed)
```bash
# Re-add Archon MCP
claude mcp add archon -s user -- http://localhost:8051/mcp
```

---

*Created: December 13, 2025*
*Phase 1 Result: 85% reduction (80.5k → 12.5k tokens)*
*Phase 2 Result: 100% reduction (80.5k → 0 tokens)*

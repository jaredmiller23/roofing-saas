---
name: archon
description: Task and project management via curl-based API. Use when checking tasks, updating task status, managing project lifecycle, querying the knowledge base, or documenting work at session start/end. Zero token overhead replacement for MCP.
allowed-tools: Bash, Read
---

# Archon Task Management Skill

**Domain**: Project & Task Management, RAG Knowledge Base
**Purpose**: curl-based patterns for Archon API (replaces MCP with zero token overhead)
**Last Updated**: December 13, 2025

## When This Skill Loads

This skill automatically loads when you're:
- Working with project tasks or status updates
- Starting or ending a coding session
- Querying the knowledge base for patterns
- Managing project lifecycle or documentation
- Discussing task workflows or status transitions

## Core Knowledge Areas

### 1. Task Management (CRUD)
### 2. Project Management
### 3. RAG Knowledge Base Queries
### 4. Document Management
### 5. Session Workflow Patterns

## Task Management

### API Endpoint: `http://localhost:8181/api/tasks`

### List Tasks
```bash
# All tasks
curl -s "http://localhost:8181/api/tasks" | jq

# Filter by status (todo, doing, review, done)
curl -s "http://localhost:8181/api/tasks?status=todo" | jq

# Filter by project
curl -s "http://localhost:8181/api/projects/PROJECT_ID/tasks" | jq

# Search tasks
curl -s "http://localhost:8181/api/tasks?q=search_term" | jq

# Paginate
curl -s "http://localhost:8181/api/tasks?page=1&per_page=10" | jq
```

### Get Single Task (Full Details)
```bash
curl -s "http://localhost:8181/api/tasks/TASK_ID" | jq
```

### Create Task
```bash
curl -X POST http://localhost:8181/api/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "project_id": "42f928ef-ac24-4eed-b539-61799e3dc325",
    "title": "Task title here",
    "description": "Detailed description of the task",
    "status": "todo",
    "assignee": "AI IDE Agent",
    "task_order": 50,
    "feature": "Phase 5"
  }' | jq
```

### Update Task
```bash
# Update status to "doing"
curl -X PUT http://localhost:8181/api/tasks/TASK_ID \
  -H "Content-Type: application/json" \
  -d '{"status": "doing"}' | jq

# Update multiple fields
curl -X PUT http://localhost:8181/api/tasks/TASK_ID \
  -H "Content-Type: application/json" \
  -d '{
    "status": "done",
    "description": "Updated description with completion notes"
  }' | jq
```

### Delete Task
```bash
curl -X DELETE http://localhost:8181/api/tasks/TASK_ID | jq
```

### Task Status Flow
```
todo -> doing -> review -> done
```

**Rules**:
- Only ONE task should be "doing" at a time
- Use "review" for work awaiting verification
- Mark "done" only after verification

### Assignee Values
- `"User"` - Human user will handle
- `"AI IDE Agent"` - Claude Code will handle
- `"Archon"` - Archon system task

## Project Management

### API Endpoint: `http://localhost:8181/api/projects`

### List Projects
```bash
curl -s "http://localhost:8181/api/projects" | jq
```

### Get Single Project
```bash
curl -s "http://localhost:8181/api/projects/PROJECT_ID" | jq
```

### Create Project
```bash
curl -X POST http://localhost:8181/api/projects \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Project Name",
    "description": "Project description and goals",
    "github_repo": "https://github.com/org/repo"
  }' | jq
```

### Update Project
```bash
curl -X PUT http://localhost:8181/api/projects/PROJECT_ID \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Updated title",
    "description": "Updated description"
  }' | jq
```

### Project IDs (Frequently Used)
```
Tennessee Roofing SaaS: 42f928ef-ac24-4eed-b539-61799e3dc325
```

## RAG Knowledge Base

### API Endpoint: `http://localhost:8181/api/rag`

### Search Knowledge Base
```bash
# Basic search
curl -X POST http://localhost:8181/api/rag/query \
  -H "Content-Type: application/json" \
  -d '{"query": "your search query", "match_count": 5}' | jq

# Filter by source domain
curl -X POST http://localhost:8181/api/rag/query \
  -H "Content-Type: application/json" \
  -d '{
    "query": "authentication patterns",
    "match_count": 5,
    "source": "docs.anthropic.com"
  }' | jq
```

### Search Code Examples
```bash
curl -X POST http://localhost:8181/api/rag/code-examples \
  -H "Content-Type: application/json" \
  -d '{
    "query": "React hook patterns",
    "match_count": 5
  }' | jq
```

### Get Available Sources
```bash
curl -s "http://localhost:8181/api/rag/sources" | jq
```

## Document Management

### API Endpoint: `http://localhost:8181/api/projects/PROJECT_ID/docs`

### List Project Documents
```bash
curl -s "http://localhost:8181/api/projects/PROJECT_ID/docs" | jq
```

### Get Single Document
```bash
curl -s "http://localhost:8181/api/projects/PROJECT_ID/docs/DOCUMENT_ID" | jq
```

### Create Document
```bash
curl -X POST http://localhost:8181/api/projects/PROJECT_ID/docs \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Document Title",
    "document_type": "spec",
    "content": {"key": "value"},
    "tags": ["backend", "auth"],
    "author": "Claude"
  }' | jq
```

### Document Types
- `spec` - Technical specifications
- `design` - Design documents
- `note` - General notes
- `prp` - Product requirements
- `api` - API documentation
- `guide` - How-to guides

## Session Workflow Patterns

### START OF SESSION (MANDATORY)
```bash
# 1. Check for TODO tasks
curl -s "http://localhost:8181/api/tasks?status=todo" | jq '.tasks[] | {id, title, feature}'

# 2. Also check current doing tasks (should be none or continue)
curl -s "http://localhost:8181/api/tasks?status=doing" | jq '.tasks[] | {id, title}'
```

### START OF WORK
```bash
# Mark task as "doing" before starting
curl -X PUT http://localhost:8181/api/tasks/TASK_ID \
  -H "Content-Type: application/json" \
  -d '{"status": "doing"}' | jq
```

### DURING WORK
- Use local TodoWrite for granular step-by-step tracking
- Keep local todos aligned with Archon task

### AFTER COMPLETING WORK
```bash
# Mark as "done" if fully complete
curl -X PUT http://localhost:8181/api/tasks/TASK_ID \
  -H "Content-Type: application/json" \
  -d '{"status": "done"}' | jq

# Or "review" if needs user verification
curl -X PUT http://localhost:8181/api/tasks/TASK_ID \
  -H "Content-Type: application/json" \
  -d '{"status": "review"}' | jq
```

### END OF SESSION (MANDATORY)
```bash
# 1. Commit all work (NEVER leave uncommitted changes)
git add -A && git commit -m "description of work"
git push origin main

# 2. Document completed work in Archon
curl -X POST http://localhost:8181/api/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "project_id": "42f928ef-ac24-4eed-b539-61799e3dc325",
    "title": "Clear descriptive title of what was done",
    "description": "Detailed description including: file paths, key decisions, status",
    "status": "done",
    "feature": "Phase X or Component"
  }' | jq

# 3. Create follow-up tasks if needed
curl -X POST http://localhost:8181/api/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "project_id": "42f928ef-ac24-4eed-b539-61799e3dc325",
    "title": "Verify [thing] after [condition]",
    "description": "What needs verification and how",
    "status": "todo",
    "assignee": "User",
    "task_order": 100
  }' | jq
```

## Health & Diagnostics

### Health Check
```bash
curl -s "http://localhost:8181/health" | jq
```

### Session Info
```bash
curl -s "http://localhost:8181/api/mcp/sessions" | jq
```

## Error Handling

### Common Response Format
```json
{
  "success": true,
  "data": {...},
  "error": null
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "error_type": "not_found",
    "message": "Task not found",
    "suggestion": "Check the task ID"
  }
}
```

### Troubleshooting
1. **Connection refused**: Archon server not running
   ```bash
   # Check if Archon is running
   curl -s http://localhost:8181/health
   ```

2. **404 Not Found**: Invalid endpoint or ID
   - Verify the task/project/document ID exists
   - Check endpoint path

3. **Timeout**: Server overloaded
   - Retry with exponential backoff
   - Check server logs

## Shell Aliases (Optional Setup)

Add to `~/.zshrc` or `~/.bashrc`:
```bash
# Archon aliases
alias archon-tasks='curl -s "http://localhost:8181/api/tasks" | jq'
alias archon-todo='curl -s "http://localhost:8181/api/tasks?status=todo" | jq'
alias archon-doing='curl -s "http://localhost:8181/api/tasks?status=doing" | jq'
alias archon-health='curl -s "http://localhost:8181/health" | jq'

# Function to update task status
archon-status() {
  curl -X PUT "http://localhost:8181/api/tasks/$1" \
    -H "Content-Type: application/json" \
    -d "{\"status\": \"$2\"}" | jq
}
# Usage: archon-status TASK_ID doing
```

## Best Practices

### DO
- Check tasks at session start
- Update status before starting work
- Document completed work with descriptive tasks
- Commit all changes before session end
- Create follow-up tasks for unfinished work

### DON'T
- Start work without checking current tasks
- Leave tasks in "doing" status indefinitely
- End session without updating Archon
- Assume task status without verification
- Leave uncommitted changes

## Quick Reference

| Operation | Command |
|-----------|---------|
| List TODO | `curl -s "http://localhost:8181/api/tasks?status=todo" \| jq` |
| Mark doing | `curl -X PUT .../tasks/ID -d '{"status":"doing"}'` |
| Mark done | `curl -X PUT .../tasks/ID -d '{"status":"done"}'` |
| Create task | `curl -X POST .../tasks -d '{...}'` |
| Search KB | `curl -X POST .../rag/query -d '{"query":"..."}'` |
| Health | `curl -s "http://localhost:8181/health"` |

---

**Remember**: This skill replaces the Archon MCP. Use curl commands directly - they have zero token overhead compared to MCP's ~12.5k token cost per invocation.

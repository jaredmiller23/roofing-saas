# Archon Session Checklists
**Created**: November 2, 2025
**Purpose**: Ensure consistent Archon workflow across all sessions

---

## 🚀 Session Start Checklist (3 minutes)

```markdown
### Archon Workflow - Session Start
- [ ] Call `mcp__archon__find_tasks(filter_by="status", filter_value="todo")`
- [ ] Review task list and priorities (check task_order values)
- [ ] Ask user: "Which task would you like to work on?" OR suggest based on priority
- [ ] Update selected task: `mcp__archon__manage_task("update", task_id="...", status="doing")`
- [ ] Create TodoWrite list aligned with Archon task
- [ ] First local todo item: "Update Archon task status"
```

### Quick Command Reference
```bash
# Get TODO tasks
mcp__archon__find_tasks(filter_by="status", filter_value="todo")

# Mark task as in progress
mcp__archon__manage_task("update", task_id="[TASK_ID]", status="doing")

# Check project info if needed
mcp__archon__find_projects(project_id="42f928ef-ac24-4eed-b539-61799e3dc325")
```

---

## 💻 During Work Checklist

```markdown
### Archon Workflow - During Work
- [ ] Keep TodoWrite synced with overall Archon task
- [ ] Update local todos as subtasks complete
- [ ] If scope changes significantly, update Archon task description
- [ ] If blocked, update task status to "review" with blocker notes
- [ ] Document key decisions in local notes for session end
```

---

## 🏁 Session End Checklist (5 minutes)

```markdown
### Archon Workflow - Session End
- [ ] Update task status: `mcp__archon__manage_task("update", task_id="...", status="done")`
   - OR status="review" if needs user verification
- [ ] Create session documentation task:
   ```
   mcp__archon__manage_task("create",
     project_id="42f928ef-ac24-4eed-b539-61799e3dc325",
     title="[Session Date] - [Work Summary]",
     description="[Detailed description of work completed]",
     status="done",
     assignee="AI IDE Agent",
     feature="[Phase/Track/Component]"
   )
   ```
- [ ] List files modified (include in description)
- [ ] Document key decisions made
- [ ] Create follow-up tasks if needed:
   ```
   mcp__archon__manage_task("create",
     project_id="42f928ef-ac24-4eed-b539-61799e3dc325",
     title="[Follow-up action needed]",
     description="[What needs to be done and why]",
     status="todo",
     assignee="User" or "AI IDE Agent",
     task_order=[priority 1-100]
   )
   ```
- [ ] Update NEXT_SESSION_START_HERE.md with session summary
```

### Quick Command Reference
```bash
# Mark task complete
mcp__archon__manage_task("update", task_id="[TASK_ID]", status="done")

# Create documentation task
mcp__archon__manage_task("create",
  project_id="42f928ef-ac24-4eed-b539-61799e3dc325",
  title="Session Work Completed",
  description="## Work Done\n- Item 1\n- Item 2\n\n## Files Modified\n- file1.tsx\n- file2.ts",
  status="done",
  assignee="AI IDE Agent",
  feature="Infrastructure"
)
```

---

## ⚠️ Critical Rules

### NEVER:
- ❌ Start work without checking Archon tasks
- ❌ Complete work without updating Archon status
- ❌ End session without documenting work in Archon
- ❌ Say "you're all set" without verification
- ❌ Assume status without checking

### ALWAYS:
- ✅ Check Archon tasks FIRST in every session
- ✅ Mark tasks "doing" before starting work
- ✅ Update status when complete or blocked
- ✅ Document all work in Archon
- ✅ Create follow-up tasks for unfinished items

---

## 📊 Task Status Flow

```
todo → doing → review → done
         ↓
      blocked (with notes)
```

- **todo**: Not started
- **doing**: Currently working (only ONE at a time)
- **review**: Complete but needs verification
- **done**: Fully complete and verified

---

## 🎯 Priority Guidelines

### task_order Values:
- **1-20**: Critical/Urgent (production issues, blockers)
- **21-50**: High Priority (current sprint work)
- **51-80**: Normal Priority (planned work)
- **81-100**: Low Priority (nice-to-have, future work)
- **100+**: Backlog (not scheduled)

### Assignee Guidelines:
- **User**: Requires user action (API keys, testing, decisions)
- **AI IDE Agent**: Can be completed by Claude Code
- **Archon**: System/automated tasks

---

## 🔧 Common Scenarios

### Scenario: Bug Fix
1. Find bug-related task or create new one
2. Mark as "doing"
3. Fix bug
4. Test fix
5. Mark as "review" with test results
6. Create follow-up task for additional testing if needed

### Scenario: Feature Implementation
1. Find feature task
2. Mark as "doing"
3. Break down into TodoWrite subtasks
4. Implement feature
5. Test implementation
6. Mark as "done"
7. Create documentation task

### Scenario: Research Task
1. Find or create research task
2. Mark as "doing"
3. Use RAG tools: `mcp__archon__rag_search_knowledge_base`
4. Document findings in task
5. Mark as "done"
6. Create implementation task based on research

---

## 📝 Template Responses

### Session Start:
"Let me check the current Archon tasks to see what we should work on today..."

### Task Selection:
"I found [X] TODO tasks. The highest priority is '[Task Title]' with priority [X]. Would you like to work on this, or would you prefer a different task?"

### Session End:
"I've completed the work and updated Archon:
- Task '[Title]' marked as done
- Created documentation task for this session
- Created [X] follow-up tasks for remaining work"

---

## 🚨 Troubleshooting

### If Archon is down:
1. Check container: `docker compose ps archon-mcp`
2. Restart if needed: `docker compose restart archon-mcp`
3. Check health: `mcp__archon__health_check`

### If task not found:
1. Verify project_id is correct
2. Check if task was archived
3. Try searching with: `mcp__archon__find_tasks(query="keyword")`

### If update fails:
1. Verify task_id exists
2. Check required fields are provided
3. Ensure valid status transition

---

## 📅 Daily Workflow

### Start of Day:
1. Check all TODO tasks
2. Review priorities
3. Plan work based on task_order

### End of Day:
1. Ensure no tasks left in "doing" status
2. Document all completed work
3. Create tasks for tomorrow's work

### Weekly Review:
1. Archive completed tasks older than 1 week
2. Re-prioritize TODO tasks
3. Update project metadata if needed

---

**Remember**: The Archon workflow ensures continuity, accountability, and clear project tracking. Following these checklists takes only 8 minutes per session but provides immense value for project management.
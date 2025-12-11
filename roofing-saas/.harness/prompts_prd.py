"""
PRD Prompt Utilities
====================

Functions for loading PRD generation prompts.
Adapted from prompts.py for PRD-specific documentation work.
"""

from pathlib import Path


def get_initializer_prompt(project_dir: Path) -> str:
    """
    Get the initializer prompt for the first session.

    Args:
        project_dir: Project directory for context

    Returns:
        The initializer prompt string
    """
    prompt_file = Path(__file__).parent / "prompts" / "prd_initializer_prompt.md"

    if prompt_file.exists():
        with open(prompt_file, "r") as f:
            return f.read()

    # Fallback inline prompt if file doesn't exist
    return _get_inline_initializer_prompt(project_dir)


def get_documentation_prompt(project_dir: Path) -> str:
    """
    Get the documentation prompt for continuation sessions.

    Args:
        project_dir: Project directory for context

    Returns:
        The documentation prompt string
    """
    prompt_file = Path(__file__).parent / "prompts" / "prd_documentation_prompt.md"

    if prompt_file.exists():
        with open(prompt_file, "r") as f:
            return f.read()

    # Fallback inline prompt if file doesn't exist
    return _get_inline_documentation_prompt(project_dir)


def _get_inline_initializer_prompt(project_dir: Path) -> str:
    """Fallback initializer prompt."""
    return f"""## YOUR ROLE - PRD INITIALIZER AGENT (Session 1 of Many)

You are the FIRST agent in a long-running PRD generation process.
Your job is to set up the documentation structure and create tasks for all future agents.

You have access to:
- Archon for task management via MCP tools
- Archon's knowledge base (RAG) for reference documentation
- The Roofing SAAS source code at /Users/ccai/roofing saas/

### FIRST: Analyze the Roofing SAAS Codebase

Start by exploring the codebase structure:
1. Read the main README and documentation files
2. Explore the directory structure
3. Identify all major modules and features
4. Review the database schema if available

### SECOND: Set Up Archon Project

1. Use `mcp__archon__manage_project` with action="create" to create a new project:
   - title: "Roofing SAAS PRD Generation"
   - description: A comprehensive PRD for the Roofing SAAS platform

2. Save the project_id for use in all subsequent operations.

### THIRD: Create Documentation Tasks

Create tasks in Archon for each documentation section. Each task should be atomic and specific.

Use `mcp__archon__manage_task` with action="create" for each task:
- project_id: [use the project you created]
- title: "Document [Section Name]"
- description: Detailed instructions for what to document
- status: "todo"
- task_order: Priority (100=highest, 0=lowest)
- feature: Category label

### FOURTH: Save Project State

Create `.archon_project.json` in {project_dir} with:
```json
{{
  "initialized": true,
  "created_at": "[timestamp]",
  "project_id": "[project ID]",
  "project_name": "Roofing SAAS PRD Generation",
  "meta_task_id": "[META task ID]",
  "total_tasks": [count]
}}
```

### ENDING THIS SESSION

Before your context fills up:
1. Ensure all tasks are created in Archon
2. Create the .archon_project.json marker file
3. Document what you accomplished

The next agent will continue from here.
"""


def _get_inline_documentation_prompt(project_dir: Path) -> str:
    """Fallback documentation prompt."""
    return f"""## YOUR ROLE - PRD DOCUMENTATION AGENT

You are continuing work on the Roofing SAAS PRD.
This is a FRESH context window - you have no memory of previous sessions.

### STEP 1: GET YOUR BEARINGS

1. Read .archon_project.json in {project_dir}
2. Query Archon for task status:
   - Use `mcp__archon__find_tasks` to see all tasks
   - Find the META task for session context
   - Identify "todo" tasks by priority

### STEP 2: SELECT NEXT TASK

Use `mcp__archon__find_tasks` with filter_by="status", filter_value="todo"
Select the highest priority task to work on.

### STEP 3: CLAIM THE TASK

Use `mcp__archon__manage_task` with action="update" to:
- Set status to "doing"

### STEP 4: DOCUMENT THE SECTION

1. Read relevant source files from /Users/ccai/roofing saas/
2. Query Archon RAG for reference documentation
3. Write the PRD section following the template
4. Validate every claim against actual code

### STEP 5: VALIDATE YOUR WORK

Before marking done, document:
- What files you referenced
- What you validated
- How you confirmed accuracy

### STEP 6: UPDATE TASK

Use `mcp__archon__manage_task` with action="update" to:
- Append validation notes to description
- Set status to "done"

### STEP 7: COMMIT & HANDOFF

1. Ensure PRD file is saved
2. Update META task with session summary
3. End cleanly for next agent

Remember: Quality over speed. Validate everything.
"""

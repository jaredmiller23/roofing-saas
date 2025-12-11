"""
Modernization Prompt Utilities
==============================

Functions for loading modernization analysis prompts.
Based on prompts_prd.py but adapted for modernization workflow.
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
    prompt_file = Path(__file__).parent / "prompts" / "modernization_initializer_prompt.md"

    if prompt_file.exists():
        with open(prompt_file, "r") as f:
            return f.read()

    # Fallback inline prompt if file doesn't exist
    return _get_inline_initializer_prompt(project_dir)


def get_analysis_prompt(project_dir: Path) -> str:
    """
    Get the modernization analysis prompt for continuation sessions.

    Args:
        project_dir: Project directory for context

    Returns:
        The analysis prompt string
    """
    prompt_file = Path(__file__).parent / "prompts" / "modernization_analysis_prompt.md"

    if prompt_file.exists():
        with open(prompt_file, "r") as f:
            return f.read()

    # Fallback inline prompt if file doesn't exist
    return _get_inline_analysis_prompt(project_dir)


def _get_inline_initializer_prompt(project_dir: Path) -> str:
    """Fallback initializer prompt."""
    return f"""## YOUR ROLE - MODERNIZATION INITIALIZER AGENT (Session 1 of Many)

You are the FIRST agent in a long-running modernization analysis process.
Your job is to set up the analysis structure and create tasks for all future agents.

You have access to:
- Archon for task management via MCP tools
- Archon's knowledge base (RAG) for reference documentation
- The original PRD at /Users/ccai/24 Harness/Test PRD/
- The Roofing SAAS source code at /Users/ccai/roofing saas/
- Puppeteer for web research

### FIRST: Read the Existing PRD

Start by understanding what's already been documented:
1. Read Test PRD/INDEX.md to see all 32 sections
2. Note the project phases and technology stack
3. Understand the scope of what needs modernization analysis

### SECOND: Set Up Archon Project

1. Use `mcp__archon__manage_project` with action="create" to create a new project:
   - title: "Roofing SAAS Modernization Analysis"
   - description: Systematic review and modernization recommendations

2. Save the project_id for use in all subsequent operations.

### THIRD: Create 32 Modernization Tasks

Create one task per PRD section with same priorities.
Use `mcp__archon__manage_task` with action="create" for each task.

### FOURTH: Test Puppeteer

Navigate to https://react.dev and take a screenshot to verify browser automation works.

### FIFTH: Save Project State

Create `.modernization_project.json` in {project_dir}

The next agent will continue from here.
"""


def _get_inline_analysis_prompt(project_dir: Path) -> str:
    """Fallback analysis prompt."""
    return f"""## YOUR ROLE - MODERNIZATION ANALYSIS AGENT

You are continuing work on the Roofing SAAS modernization analysis.
This is a FRESH context window - you have no memory of previous sessions.

### STEP 1: GET YOUR BEARINGS

1. Read .modernization_project.json in {project_dir}
2. Query Archon for task status

### STEP 2: SELECT NEXT TASK

Use `mcp__archon__find_tasks` to find the highest priority "todo" task

### STEP 3: READ & UPDATE PRD

1. Read the assigned PRD section from Test PRD/
2. Review corresponding source code
3. Update PRD if discrepancies found

### STEP 4: WEB RESEARCH

Use Puppeteer to research modern alternatives:
- Visit 5+ websites
- Take 5+ screenshots
- Document sources

### STEP 5: PLAY DEVIL'S ADVOCATE

Challenge every assumption:
- Why this framework?
- What are alternatives?
- What's changed since Sept 2025?

### STEP 6: WRITE ANALYSIS

Create modernization analysis file with:
- PRD accuracy assessment
- Current implementation analysis
- Modern alternatives research
- Devil's advocate questions
- Innovation opportunities
- Recommendations

### STEP 7: UPDATE TASK

Mark task as "done" with validation notes

Remember: Challenge everything. Research thoroughly.
"""

"""
Claude SDK Client Configuration (Modernization Version)
=======================================================

Functions for creating and configuring the Claude Agent SDK client
with Archon MCP integration for task management and Puppeteer for research.

Based on client_archon.py but adapted for modernization analysis workflow.
"""

import json
import os
from pathlib import Path

from claude_code_sdk import ClaudeCodeOptions, ClaudeSDKClient
from claude_code_sdk.types import HookMatcher

from security import bash_security_hook
from modernization_config import ARCHON_MCP_URL


# Puppeteer MCP tools for browser automation and web research
PUPPETEER_TOOLS = [
    "mcp__puppeteer__puppeteer_navigate",
    "mcp__puppeteer__puppeteer_screenshot",
    "mcp__puppeteer__puppeteer_click",
    "mcp__puppeteer__puppeteer_fill",
    "mcp__puppeteer__puppeteer_select",
    "mcp__puppeteer__puppeteer_hover",
    "mcp__puppeteer__puppeteer_evaluate",
    "mcp__puppeteer__puppeteer_get_visible_text",
    "mcp__puppeteer__puppeteer_get_visible_html",
]

# Archon MCP tools for task management and knowledge base
ARCHON_TOOLS = [
    # Task management (consolidated tools)
    "mcp__archon__find_tasks",
    "mcp__archon__manage_task",
    # Project management
    "mcp__archon__find_projects",
    "mcp__archon__manage_project",
    # Document management
    "mcp__archon__find_documents",
    "mcp__archon__manage_document",
    # Version management
    "mcp__archon__find_versions",
    "mcp__archon__manage_version",
    # RAG / Knowledge base
    "mcp__archon__rag_search_knowledge_base",
    "mcp__archon__rag_search_code_examples",
    "mcp__archon__rag_get_available_sources",
    # Feature tracking
    "mcp__archon__get_project_features",
    # Health and diagnostics
    "mcp__archon__health_check",
    "mcp__archon__session_info",
]

# Built-in tools
BUILTIN_TOOLS = [
    "Read",
    "Write",
    "Edit",
    "Glob",
    "Grep",
    "Bash",
]


def verify_archon_connection() -> bool:
    """
    Verify that Archon services are reachable.

    Returns:
        True if connection successful, False otherwise
    """
    import urllib.request
    import urllib.error

    # Archon backend health is at port 8181, MCP is at 8051
    # Check the backend health endpoint
    health_url = "http://localhost:8181/health"

    try:
        req = urllib.request.Request(health_url, method='GET')
        with urllib.request.urlopen(req, timeout=5) as response:
            return response.status == 200
    except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError):
        return False


def create_client(project_dir: Path, model: str) -> ClaudeSDKClient:
    """
    Create a Claude Agent SDK client for modernization analysis.

    Args:
        project_dir: Directory for the modernization analysis output
        model: Claude model to use (recommend Opus 4.5 for better reasoning)

    Returns:
        Configured ClaudeSDKClient

    Security layers (defense in depth):
    1. Sandbox - OS-level bash command isolation prevents filesystem escape
    2. Permissions - File operations restricted to allowed directories
    3. Security hooks - Bash commands validated against an allowlist
       (see security.py for ALLOWED_COMMANDS)

    Note: Authentication is handled automatically by the Claude Code CLI.
    The SDK uses the CLI's existing authentication - no manual token setup needed.
    """
    # Authentication is automatic through the Claude Code CLI
    # No need to check for CLAUDE_CODE_OAUTH_TOKEN

    # Verify Archon is reachable
    if not verify_archon_connection():
        raise ConnectionError(
            f"Cannot connect to Archon MCP server at {ARCHON_MCP_URL}\n"
            "Please ensure Archon Docker containers are running:\n"
            "  cd /Users/ccai/archon && docker compose up -d\n"
            "Then verify with: curl http://localhost:8051/health"
        )

    # Create comprehensive security settings
    # CRITICAL: Allows writing to original PRD for updates
    security_settings = {
        "sandbox": {"enabled": True, "autoAllowBashIfSandboxed": True},
        "permissions": {
            "defaultMode": "acceptEdits",  # Auto-approve edits within allowed directories
            "allow": [
                # Allow all file operations within the project directory
                "Read(./**)",
                "Write(./**)",
                "Edit(./**)",
                "Glob(./**)",
                "Grep(./**)",
                # CRITICAL: Allow READ + WRITE + EDIT for original PRD (for updating discrepancies)
                "Read(/Users/ccai/24 Harness/Test PRD/**)",
                "Write(/Users/ccai/24 Harness/Test PRD/**)",
                "Edit(/Users/ccai/24 Harness/Test PRD/**)",
                "Glob(/Users/ccai/24 Harness/Test PRD/**)",
                "Grep(/Users/ccai/24 Harness/Test PRD/**)",
                # Read-only access to source code for analysis
                "Read(/Users/ccai/roofing saas/**)",
                "Glob(/Users/ccai/roofing saas/**)",
                "Grep(/Users/ccai/roofing saas/**)",
                # Bash permission granted here, but actual commands are validated
                # by the bash_security_hook (see security.py for allowed commands)
                "Bash(*)",
                # Allow Puppeteer MCP tools for web research
                *PUPPETEER_TOOLS,
                # Allow Archon MCP tools for task management and RAG
                *ARCHON_TOOLS,
            ],
        },
    }

    # Ensure project directory exists before creating settings file
    project_dir.mkdir(parents=True, exist_ok=True)

    # Write settings to a file in the project directory
    settings_file = project_dir / ".claude_settings.json"
    with open(settings_file, "w") as f:
        json.dump(security_settings, f, indent=2)

    print(f"Created security settings at {settings_file}")
    print("   - Sandbox enabled (OS-level bash isolation)")
    print(f"   - Modernization output: {project_dir.resolve()}")
    print("   - PRD updates allowed: /Users/ccai/24 Harness/Test PRD/")
    print("   - Source code (read-only): /Users/ccai/roofing saas/")
    print("   - Bash commands restricted to allowlist (see security.py)")
    print("   - MCP servers: puppeteer (research), archon (tasks + RAG)")
    print()

    return ClaudeSDKClient(
        options=ClaudeCodeOptions(
            model=model,
            system_prompt=(
                "You are an expert technology strategist performing modernization analysis.\n\n"

                "Your mission: Challenge every assumption in the Roofing SAAS architecture.\n\n"

                "You have access to:\n"
                "- Archon for task management and tracking analysis progress\n"
                "- Archon's knowledge base (RAG) for historical tech documentation\n"
                "- The original PRD at /Users/ccai/24 Harness/Test PRD/\n"
                "- The live source code at /Users/ccai/roofing saas/\n"
                "- Puppeteer for web research (framework docs, architecture patterns, new tech)\n\n"

                "Your approach for EACH section:\n"
                "1. Read the existing PRD section\n"
                "2. Review the actual source code implementation\n"
                "3. Update PRD if discrepancies found between doc and code\n"
                "4. Research modern alternatives using Puppeteer (5+ sites, 5+ screenshots)\n"
                "5. Play devil's advocate - challenge every decision\n"
                "6. Compare 'then vs now' - what's changed since Sept 2025\n"
                "7. Identify opportunities for innovation\n"
                "8. Document: 'If we rewrote this today, what would we do differently?'\n\n"

                "Quality requirements:\n"
                "- Every analysis must cite 5+ research sources (URLs)\n"
                "- Every assumption must be challenged\n"
                "- Every recommendation must have ROI estimate\n"
                "- Screenshots required for key findings\n"
            ),
            allowed_tools=[
                *BUILTIN_TOOLS,
                *PUPPETEER_TOOLS,
                *ARCHON_TOOLS,
            ],
            mcp_servers={
                "puppeteer": {"command": "npx", "args": ["puppeteer-mcp-server"]},
                # Archon MCP with HTTP transport
                "archon": {
                    "type": "http",
                    "url": ARCHON_MCP_URL,
                }
            },
            hooks={
                "PreToolUse": [
                    HookMatcher(matcher="Bash", hooks=[bash_security_hook]),
                ],
            },
            max_turns=1000,
            cwd=str(project_dir.resolve()),
            settings=str(settings_file.resolve()),  # Use absolute path
        )
    )

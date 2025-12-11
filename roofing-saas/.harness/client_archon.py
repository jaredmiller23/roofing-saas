"""
Claude SDK Client Configuration (Archon Version)
=================================================

Functions for creating and configuring the Claude Agent SDK client
with Archon MCP integration for task management and knowledge base access.

This replaces client.py for Archon-based workflows.
"""

import json
import os
from pathlib import Path

from claude_code_sdk import ClaudeCodeOptions, ClaudeSDKClient
from claude_code_sdk.types import HookMatcher

from security import bash_security_hook
from archon_config import ARCHON_MCP_URL


# Puppeteer MCP tools for browser automation (unchanged from original)
PUPPETEER_TOOLS = [
    "mcp__puppeteer__puppeteer_navigate",
    "mcp__puppeteer__puppeteer_screenshot",
    "mcp__puppeteer__puppeteer_click",
    "mcp__puppeteer__puppeteer_fill",
    "mcp__puppeteer__puppeteer_select",
    "mcp__puppeteer__puppeteer_hover",
    "mcp__puppeteer__puppeteer_evaluate",
]

# Archon MCP tools for task management and knowledge base
ARCHON_TOOLS = [
    # Task management (consolidated tools)
    "mcp__archon__find_tasks",
    "mcp__archon__manage_task",
    # Project management
    "mcp__archon__find_projects",
    "mcp__archon__manage_project",
    # Document management (for storing PRD sections)
    "mcp__archon__find_documents",
    "mcp__archon__manage_document",
    # Version management
    "mcp__archon__find_versions",
    "mcp__archon__manage_version",
    # RAG / Knowledge base (key advantage over Linear!)
    "mcp__archon__rag_search_knowledge_base",
    "mcp__archon__rag_search_code_examples",
    "mcp__archon__rag_get_available_sources",
    # Feature tracking
    "mcp__archon__get_project_features",
    # Health and diagnostics
    "mcp__archon__health_check",
    "mcp__archon__session_info",
]

# Built-in tools (unchanged)
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
    Create a Claude Agent SDK client with Archon MCP integration.

    Args:
        project_dir: Directory for the project
        model: Claude model to use

    Returns:
        Configured ClaudeSDKClient

    Security layers (defense in depth):
    1. Sandbox - OS-level bash command isolation prevents filesystem escape
    2. Permissions - File operations restricted to project_dir only
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
    # Note: Using relative paths ("./**") restricts access to project directory
    # since cwd is set to project_dir
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
                # Also allow reading from the Roofing SAAS directory for PRD generation
                "Read(/Users/ccai/roofing saas/**)",
                "Glob(/Users/ccai/roofing saas/**)",
                "Grep(/Users/ccai/roofing saas/**)",
                # Bash permission granted here, but actual commands are validated
                # by the bash_security_hook (see security.py for allowed commands)
                "Bash(*)",
                # Allow Puppeteer MCP tools for browser automation
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
    print(f"   - Filesystem restricted to: {project_dir.resolve()}")
    print("   - Read access to: /Users/ccai/roofing saas/")
    print("   - Bash commands restricted to allowlist (see security.py)")
    print("   - MCP servers: puppeteer (browser), archon (tasks + RAG)")
    print()

    return ClaudeSDKClient(
        options=ClaudeCodeOptions(
            model=model,
            system_prompt=(
                "You are an expert technical writer creating a Production Requirements "
                "Document (PRD) for the Roofing SAAS application. You have access to:\n"
                "- Archon for task management and tracking your documentation progress\n"
                "- Archon's knowledge base (RAG) for reference documentation\n"
                "- The Roofing SAAS source code at /Users/ccai/roofing saas/\n"
                "- Puppeteer for browser-based verification if needed\n\n"
                "Your job is to systematically document the application, validating "
                "every claim against the actual source code."
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

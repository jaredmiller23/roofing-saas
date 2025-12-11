#!/usr/bin/env python3
"""
Autonomous PRD Generation Demo
==============================

A harness for generating Production Requirements Documents using Claude
with Archon for task management and knowledge base access.

This is adapted from Anthropic's autonomous coding agent demo to work
with Archon instead of Linear, specifically for documentation tasks.

Example Usage:
    python autonomous_prd_demo.py --project-dir ./prd_test
    python autonomous_prd_demo.py --project-dir ./prd_test --max-iterations 5
"""

import argparse
import asyncio
import os
from pathlib import Path

from agent_archon import run_autonomous_agent


# Configuration
# Using Claude Opus 4.5 as default for best analysis and writing quality
DEFAULT_MODEL = "claude-opus-4-5-20251101"


def parse_args() -> argparse.Namespace:
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(
        description="Autonomous PRD Generation Demo - Archon-powered documentation harness",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Start fresh PRD project
  python autonomous_prd_demo.py --project-dir ./Test\\ PRD

  # Use a specific model
  python autonomous_prd_demo.py --project-dir ./Test\\ PRD --model claude-sonnet-4-5-20250929

  # Limit iterations for testing
  python autonomous_prd_demo.py --project-dir ./Test\\ PRD --max-iterations 3

  # Continue existing project
  python autonomous_prd_demo.py --project-dir ./Test\\ PRD

Environment Variables:
  CLAUDE_CODE_OAUTH_TOKEN    Claude Code OAuth token (required)
  ARCHON_MCP_URL             Archon MCP server URL (default: http://localhost:8051/mcp)

Prerequisites:
  - Archon Docker containers must be running
  - Claude Code CLI installed with OAuth token set up
        """,
    )

    parser.add_argument(
        "--project-dir",
        type=Path,
        default=Path("./Test PRD"),
        help="Directory for PRD output (default: ./Test PRD)",
    )

    parser.add_argument(
        "--max-iterations",
        type=int,
        default=None,
        help="Maximum number of agent iterations (default: unlimited)",
    )

    parser.add_argument(
        "--model",
        type=str,
        default=DEFAULT_MODEL,
        help=f"Claude model to use (default: {DEFAULT_MODEL})",
    )

    return parser.parse_args()


def check_archon_status() -> bool:
    """
    Check if Archon services are reachable.

    Returns:
        True if Archon is running and accessible
    """
    import urllib.request
    import urllib.error

    # Archon backend health is at port 8181, MCP is at 8051
    health_url = "http://localhost:8181/health"

    try:
        req = urllib.request.Request(health_url, method='GET')
        with urllib.request.urlopen(req, timeout=5) as response:
            if response.status == 200:
                print(f"Archon backend: OK (localhost:8181)")
                print(f"Archon MCP server: localhost:8051")
                return True
    except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError) as e:
        print(f"Archon backend: NOT REACHABLE (localhost:8181)")
        print(f"  Error: {e}")
        return False

    return False


def main() -> None:
    """Main entry point."""
    args = parse_args()

    # Note: Authentication is handled automatically by the Claude Code CLI
    # No need to check for CLAUDE_CODE_OAUTH_TOKEN

    # Check Archon status
    print("\nChecking prerequisites...")
    if not check_archon_status():
        print("\nError: Archon MCP server is not running")
        print("\nPlease start Archon:")
        print("  cd /Users/ccai/archon")
        print("  docker compose up -d")
        print("\nThen verify it's running:")
        print("  curl http://localhost:8051/health")
        return

    print("Prerequisites OK!\n")

    # Use the project directory as specified
    project_dir = args.project_dir
    if not project_dir.is_absolute():
        # Make relative to current working directory
        project_dir = Path.cwd() / project_dir

    # Run the agent
    try:
        asyncio.run(
            run_autonomous_agent(
                project_dir=project_dir,
                model=args.model,
                max_iterations=args.max_iterations,
            )
        )
    except KeyboardInterrupt:
        print("\n\nInterrupted by user")
        print("To resume, run the same command again")
    except Exception as e:
        print(f"\nFatal error: {e}")
        raise


if __name__ == "__main__":
    main()

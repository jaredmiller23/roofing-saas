#!/usr/bin/env python3
"""
Autonomous Modernization Analysis Demo
======================================

A harness for analyzing and modernizing the Roofing SAAS architecture using Claude
with Archon for task management and Puppeteer for web research.

This is adapted from autonomous_prd_demo.py to perform modernization analysis
instead of documentation generation.

Example Usage:
    python autonomous_modernization_demo.py --project-dir ./PRD\\ Modernization\\ Analysis
    python autonomous_modernization_demo.py --project-dir ./PRD\\ Modernization\\ Analysis --max-iterations 5
"""

import argparse
import asyncio
import os
from pathlib import Path

from agent_modernization import run_autonomous_agent


# Configuration
# Using Claude Opus 4.5 as default for best reasoning and devil's advocate analysis
DEFAULT_MODEL = "claude-opus-4-5-20251101"


def parse_args() -> argparse.Namespace:
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(
        description="Autonomous Modernization Analysis Demo - Archon + Puppeteer-powered analysis harness",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Start fresh modernization project
  python autonomous_modernization_demo.py --project-dir ./PRD\\ Modernization\\ Analysis

  # Use a specific model
  python autonomous_modernization_demo.py --model claude-sonnet-4-5-20250929

  # Limit iterations for testing
  python autonomous_modernization_demo.py --max-iterations 3

  # Continue existing project
  python autonomous_modernization_demo.py

Environment Variables:
  CLAUDE_CODE_OAUTH_TOKEN    Claude Code OAuth token (required)
  ARCHON_MCP_URL             Archon MCP server URL (default: http://localhost:8051/mcp)

Prerequisites:
  - Archon Docker containers must be running
  - Claude Code CLI installed with OAuth token set up
  - Puppeteer MCP server available (auto-launched via npx)
  - Original PRD at /Users/ccai/24 Harness/Test PRD/
  - Source code at /Users/ccai/roofing saas/
        """,
    )

    parser.add_argument(
        "--project-dir",
        type=Path,
        default=Path("./PRD Modernization Analysis"),
        help="Directory for modernization analysis output (default: ./PRD Modernization Analysis)",
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


def check_prerequisites() -> bool:
    """
    Check if all prerequisites are available.

    Returns:
        True if all prerequisites are met
    """
    print("\nChecking prerequisites...")

    # Check Archon status
    if not check_archon_status():
        print("\nError: Archon MCP server is not running")
        print("\nPlease start Archon:")
        print("  cd /Users/ccai/archon")
        print("  docker compose up -d")
        print("\nThen verify it's running:")
        print("  curl http://localhost:8051/health")
        return False

    # Check if original PRD exists
    prd_dir = Path("/Users/ccai/24 Harness/Test PRD")
    if not prd_dir.exists():
        print(f"\nError: Original PRD directory not found at {prd_dir}")
        print("The modernization harness requires the original PRD to analyze.")
        return False

    print(f"Original PRD: Found at {prd_dir}")

    # Check if source code exists
    code_dir = Path("/Users/ccai/roofing saas")
    if not code_dir.exists():
        print(f"\nWarning: Source code directory not found at {code_dir}")
        print("Some analysis may be limited without access to source code.")
        # Don't fail - can still analyze PRD

    print(f"Source code: Found at {code_dir}")

    print("Prerequisites OK!\n")
    return True


def main() -> None:
    """Main entry point."""
    args = parse_args()

    # Note: Authentication is handled automatically by the Claude Code CLI
    # No need to check for CLAUDE_CODE_OAUTH_TOKEN

    # Check prerequisites
    if not check_prerequisites():
        return

    # Use the project directory as specified
    project_dir = args.project_dir
    if not project_dir.is_absolute():
        # Make relative to current working directory
        project_dir = Path.cwd() / project_dir

    print("\n" + "=" * 70)
    print("  MODERNIZATION ANALYSIS HARNESS")
    print("=" * 70)
    print(f"\nThis harness will:")
    print("  1. Read each of the 32 PRD sections")
    print("  2. Review the live source code")
    print("  3. Update PRD if discrepancies found")
    print("  4. Research modern alternatives (5+ websites per section)")
    print("  5. Play devil's advocate on all architectural decisions")
    print("  6. Generate comprehensive modernization analysis")
    print()
    print("Expected time: 8-16 hours for all 32 sections (can run overnight)")
    print("=" * 70)
    print()

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

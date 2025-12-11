"""
Progress Tracking Utilities (Archon Version)
============================================

Functions for tracking and displaying progress of the autonomous PRD agent.
Progress is tracked via Archon tasks, with local state cached in .archon_project.json.

Replaces progress.py for Archon-based workflows.
"""

import json
from pathlib import Path
from datetime import datetime

from archon_config import ARCHON_PROJECT_MARKER


def load_archon_project_state(project_dir: Path) -> dict | None:
    """
    Load the Archon project state from the marker file.

    Args:
        project_dir: Directory containing .archon_project.json

    Returns:
        Project state dict or None if not initialized
    """
    marker_file = project_dir / ARCHON_PROJECT_MARKER

    if not marker_file.exists():
        return None

    try:
        with open(marker_file, "r") as f:
            return json.load(f)
    except (json.JSONDecodeError, IOError):
        return None


def save_archon_project_state(project_dir: Path, state: dict) -> None:
    """
    Save the Archon project state to the marker file.

    Args:
        project_dir: Directory to save .archon_project.json
        state: Project state dictionary
    """
    marker_file = project_dir / ARCHON_PROJECT_MARKER

    # Add/update timestamp
    state["updated_at"] = datetime.now().isoformat()

    with open(marker_file, "w") as f:
        json.dump(state, f, indent=2)


def is_archon_initialized(project_dir: Path) -> bool:
    """
    Check if Archon project has been initialized.

    Args:
        project_dir: Directory to check

    Returns:
        True if .archon_project.json exists and is valid
    """
    state = load_archon_project_state(project_dir)
    return state is not None and state.get("initialized", False)


def create_initial_state(
    project_id: str,
    project_name: str,
    meta_task_id: str,
    total_tasks: int,
) -> dict:
    """
    Create the initial project state structure.

    Args:
        project_id: Archon project UUID
        project_name: Human-readable project name
        meta_task_id: UUID of the META tracking task
        total_tasks: Number of documentation tasks created

    Returns:
        Initial state dictionary
    """
    return {
        "initialized": True,
        "created_at": datetime.now().isoformat(),
        "updated_at": datetime.now().isoformat(),
        "project_id": project_id,
        "project_name": project_name,
        "meta_task_id": meta_task_id,
        "total_tasks": total_tasks,
        "notes": "PRD project initialized by initializer agent",
        # Session tracking
        "sessions": [],
    }


def add_session_record(
    project_dir: Path,
    session_num: int,
    tasks_completed: int,
    summary: str,
) -> None:
    """
    Add a session record to the project state.

    Args:
        project_dir: Project directory
        session_num: Session number
        tasks_completed: Number of tasks completed this session
        summary: Brief summary of work done
    """
    state = load_archon_project_state(project_dir)
    if state is None:
        return

    session_record = {
        "session": session_num,
        "timestamp": datetime.now().isoformat(),
        "tasks_completed": tasks_completed,
        "summary": summary,
    }

    if "sessions" not in state:
        state["sessions"] = []

    state["sessions"].append(session_record)
    save_archon_project_state(project_dir, state)


def print_session_header(session_num: int, is_initializer: bool) -> None:
    """Print a formatted header for the session."""
    session_type = "INITIALIZER" if is_initializer else "PRD DOCUMENTATION AGENT"

    print("\n" + "=" * 70)
    print(f"  SESSION {session_num}: {session_type}")
    print("=" * 70)
    print()


def print_progress_summary(project_dir: Path) -> None:
    """
    Print a summary of current progress.

    Since actual progress is tracked in Archon, this reads the local
    state file for cached information. The agent updates Archon directly
    and reports progress in session summaries.
    """
    state = load_archon_project_state(project_dir)

    if state is None:
        print("\nProgress: Archon project not yet initialized")
        return

    total = state.get("total_tasks", 0)
    meta_task = state.get("meta_task_id", "unknown")
    project_name = state.get("project_name", "Unknown Project")
    sessions = state.get("sessions", [])

    print(f"\nArchon Project Status: {project_name}")
    print(f"  Total documentation tasks: {total}")
    print(f"  META task ID: {meta_task}")
    print(f"  Sessions completed: {len(sessions)}")

    if sessions:
        last_session = sessions[-1]
        session_num = last_session.get('session') or last_session.get('session_number', '?')
        print(f"  Last session: #{session_num} - {last_session.get('summary', 'No summary')[:50]}...")

    print(f"  (Check Archon UI for current task status counts)")


def get_project_id(project_dir: Path) -> str | None:
    """
    Get the Archon project ID from the marker file.

    Args:
        project_dir: Project directory

    Returns:
        Project ID string or None if not initialized
    """
    state = load_archon_project_state(project_dir)
    if state is None:
        return None
    return state.get("project_id")


def get_meta_task_id(project_dir: Path) -> str | None:
    """
    Get the META task ID from the marker file.

    Args:
        project_dir: Project directory

    Returns:
        META task ID string or None if not initialized
    """
    state = load_archon_project_state(project_dir)
    if state is None:
        return None
    return state.get("meta_task_id")

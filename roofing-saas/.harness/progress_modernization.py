"""
Progress Tracking Utilities (Modernization Version)
===================================================

Functions for tracking and displaying progress of the autonomous modernization agent.
Progress is tracked via Archon tasks, with local state cached in .modernization_project.json.

Based on progress_archon.py but adapted for modernization workflow.
"""

import json
from pathlib import Path
from datetime import datetime

from modernization_config import MODERNIZATION_MARKER


def load_modernization_project_state(project_dir: Path) -> dict | None:
    """
    Load the modernization project state from the marker file.

    Args:
        project_dir: Directory containing .modernization_project.json

    Returns:
        Project state dict or None if not initialized
    """
    marker_file = project_dir / MODERNIZATION_MARKER

    if not marker_file.exists():
        return None

    try:
        with open(marker_file, "r") as f:
            return json.load(f)
    except (json.JSONDecodeError, IOError):
        return None


def save_modernization_project_state(project_dir: Path, state: dict) -> None:
    """
    Save the modernization project state to the marker file.

    Args:
        project_dir: Directory to save .modernization_project.json
        state: Project state dictionary
    """
    marker_file = project_dir / MODERNIZATION_MARKER

    # Add/update timestamp
    state["updated_at"] = datetime.now().isoformat()

    with open(marker_file, "w") as f:
        json.dump(state, f, indent=2)


def is_modernization_initialized(project_dir: Path) -> bool:
    """
    Check if modernization project has been initialized.

    Args:
        project_dir: Directory to check

    Returns:
        True if .modernization_project.json exists and is valid
    """
    state = load_modernization_project_state(project_dir)
    return state is not None and state.get("initialized", False)


def create_initial_state(
    project_id: str,
    project_name: str,
    meta_task_id: str,
    total_tasks: int,
    prd_source_dir: str,
    source_code_dir: str,
) -> dict:
    """
    Create the initial project state structure.

    Args:
        project_id: Archon project UUID
        project_name: Human-readable project name
        meta_task_id: UUID of the META tracking task
        total_tasks: Number of modernization tasks created
        prd_source_dir: Path to original PRD files
        source_code_dir: Path to source code

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
        "prd_source_dir": prd_source_dir,
        "source_code_dir": source_code_dir,
        "notes": "Modernization project initialized by initializer agent",
        # Modernization-specific metrics
        "sections_analyzed": 0,
        "sections_with_discrepancies": 0,
        "total_recommendations": 0,
        "total_research_urls": 0,
        "total_screenshots": 0,
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
    state = load_modernization_project_state(project_dir)
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
    save_modernization_project_state(project_dir, state)


def update_modernization_metrics(
    project_dir: Path,
    sections_analyzed: int = None,
    prd_updated: bool = False,
    recommendations_count: int = None,
    research_urls: int = None,
    screenshots: int = None,
) -> None:
    """
    Update modernization-specific metrics.

    Args:
        project_dir: Project directory
        sections_analyzed: Increment sections analyzed counter
        prd_updated: Whether PRD was updated this session
        recommendations_count: Number of recommendations added
        research_urls: Number of research URLs visited
        screenshots: Number of screenshots taken
    """
    state = load_modernization_project_state(project_dir)
    if state is None:
        return

    if sections_analyzed is not None:
        state["sections_analyzed"] = state.get("sections_analyzed", 0) + sections_analyzed

    if prd_updated:
        state["sections_with_discrepancies"] = state.get("sections_with_discrepancies", 0) + 1

    if recommendations_count is not None:
        state["total_recommendations"] = state.get("total_recommendations", 0) + recommendations_count

    if research_urls is not None:
        state["total_research_urls"] = state.get("total_research_urls", 0) + research_urls

    if screenshots is not None:
        state["total_screenshots"] = state.get("total_screenshots", 0) + screenshots

    save_modernization_project_state(project_dir, state)


def print_session_header(session_num: int, is_initializer: bool) -> None:
    """Print a formatted header for the session."""
    session_type = "INITIALIZER" if is_initializer else "MODERNIZATION ANALYSIS AGENT"

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
    state = load_modernization_project_state(project_dir)

    if state is None:
        print("\nProgress: Modernization project not yet initialized")
        return

    total = state.get("total_tasks", 0)
    analyzed = state.get("sections_analyzed", 0)
    discrepancies = state.get("sections_with_discrepancies", 0)
    recommendations = state.get("total_recommendations", 0)
    research_urls = state.get("total_research_urls", 0)
    screenshots = state.get("total_screenshots", 0)
    meta_task = state.get("meta_task_id", "unknown")
    project_name = state.get("project_name", "Unknown Project")
    sessions = state.get("sessions", [])

    print(f"\nModernization Project Status: {project_name}")
    print(f"  Total analysis tasks: {total}")
    print(f"  Sections analyzed: {analyzed}")
    print(f"  PRD sections updated: {discrepancies}")
    print(f"  Total recommendations: {recommendations}")
    print(f"  Research URLs visited: {research_urls}")
    print(f"  Screenshots captured: {screenshots}")
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
    state = load_modernization_project_state(project_dir)
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
    state = load_modernization_project_state(project_dir)
    if state is None:
        return None
    return state.get("meta_task_id")


def get_prd_source_dir(project_dir: Path) -> str | None:
    """
    Get the PRD source directory from the marker file.

    Args:
        project_dir: Project directory

    Returns:
        PRD source directory path or None if not initialized
    """
    state = load_modernization_project_state(project_dir)
    if state is None:
        return None
    return state.get("prd_source_dir")


def get_source_code_dir(project_dir: Path) -> str | None:
    """
    Get the source code directory from the marker file.

    Args:
        project_dir: Project directory

    Returns:
        Source code directory path or None if not initialized
    """
    state = load_modernization_project_state(project_dir)
    if state is None:
        return None
    return state.get("source_code_dir")

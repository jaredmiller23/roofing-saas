#!/usr/bin/env python3
"""
Create Autonomous AI Capabilities Research Project in Archon

This script loads all experiments from the research roadmap into Archon
as a structured project with proper priorities, dependencies, and tracking.
"""

import asyncio
import httpx
from datetime import datetime
from typing import List, Dict

# Archon MCP configuration
ARCHON_BASE_URL = "http://localhost:8181"
PROJECT_NAME = "Autonomous AI Capabilities Research"
PROJECT_DESCRIPTION = """
Systematic exploration of autonomous AI capabilities based on discoveries
from the PRD generation experiment.

Goal: Understand boundaries of autonomous AI quality, persistence,
generalization, and collaboration through rigorous experimentation.

Based on: PRD Generation Experiment (Dec 2025)
Roadmap: AUTONOMOUS_AI_RESEARCH_ROADMAP.md
"""

# Task definitions organized by feature area
TASKS = [
    # 1. FAILURE RECOVERY & RESILIENCE (Priority: 100)
    {
        "title": "State File Corruption Recovery",
        "description": """Test how agents handle corrupted state files.

Experiment:
- Corrupt .archon_project.json mid-session
- Measure detection time and recovery success
- Document recovery strategies

Success Criteria:
- Agent detects corruption within 30 seconds
- Recovery success rate > 80%
- Data loss < 10% of tasks

Metrics:
- Detection time (seconds)
- Recovery success rate (%)
- Data loss (tasks/sessions lost)
- Recovery strategy effectiveness

Deliverable: Corruption recovery protocol
""",
        "priority": 100,
        "feature": "failure-recovery",
        "estimated_hours": 3,
        "dependencies": []
    },
    {
        "title": "Network Interruption Resilience",
        "description": """Test agent behavior when Archon MCP goes offline.

Experiment:
- Stop Archon mid-session
- Observe agent response
- Restart Archon, test sync

Success Criteria:
- Agent queues operations locally
- Sync success rate > 95% on reconnect
- No data inconsistencies

Deliverable: Network resilience architecture
""",
        "priority": 100,
        "feature": "failure-recovery",
        "estimated_hours": 4,
        "dependencies": []
    },
    {
        "title": "Invalid File Reference Handling",
        "description": """Test agent response to non-existent files in prompts.

Experiment:
- Reference files that don't exist
- Measure detection and error handling
- Test for hallucination

Success Criteria:
- Detection rate > 95%
- Zero hallucinated content
- Clear error messages

Deliverable: File validation best practices
""",
        "priority": 100,
        "feature": "failure-recovery",
        "estimated_hours": 2,
        "dependencies": []
    },

    # 2. QUALITY PERSISTENCE (Priority: 90)
    {
        "title": "Extended Session Testing (50+ sessions)",
        "description": """Run autonomous agent for 50+ sessions, track quality degradation.

Experiment:
- Run PRD generation for 50 sessions
- Collect quality metrics per session
- Identify degradation points

Metrics:
- Validation coverage trend
- Files examined trend
- Documentation completeness
- Cross-reference density

Deliverable: Quality persistence curve analysis
""",
        "priority": 90,
        "feature": "quality-persistence",
        "estimated_hours": 12,
        "dependencies": []
    },
    {
        "title": "Quality Drift Detection System",
        "description": """Build automated quality monitoring tool.

Goal: Detect when agent output quality degrades

Features:
- Validation coverage checker
- Hallucination detector
- Completeness scorer
- Real-time alerts

Deliverable: Quality monitoring tool (open source)
""",
        "priority": 90,
        "feature": "quality-persistence",
        "estimated_hours": 6,
        "dependencies": ["Extended Session Testing (50+ sessions)"]
    },

    # 3. CROSS-DOMAIN TRANSFER (Priority: 85)
    {
        "title": "Different Codebase - Same Task",
        "description": """Test PRD harness on completely different codebase.

Experiment:
- Point harness at e-commerce app (not roofing)
- Run documentation generation
- Compare quality to baseline

Success Criteria:
- Quality score within 10% of baseline
- File discovery success > 90%
- Technology stack adaptation successful

Deliverable: Cross-codebase generalization report
""",
        "priority": 85,
        "feature": "cross-domain-transfer",
        "estimated_hours": 10,
        "dependencies": []
    },
    {
        "title": "API Documentation Generation",
        "description": """Adapt harness to generate API docs instead of PRDs.

Changes:
- New prompt templates
- OpenAPI format output
- Endpoint-focused research

Success Criteria:
- Endpoint coverage > 95%
- Parameter accuracy > 98%
- Example quality scored > 8/10

Deliverable: API documentation harness variant
""",
        "priority": 85,
        "feature": "cross-domain-transfer",
        "estimated_hours": 6,
        "dependencies": []
    },
    {
        "title": "User Guide Generation",
        "description": """Adapt harness for end-user documentation.

Focus:
- Non-technical language
- Screenshot integration
- Workflow-based structure

Success Criteria:
- Flesch-Kincaid readability > 60
- User testing score > 7/10
- Workflow accuracy > 90%

Deliverable: User guide generation harness
""",
        "priority": 85,
        "feature": "cross-domain-transfer",
        "estimated_hours": 8,
        "dependencies": []
    },

    # 4. SCALABILITY (Priority: 75)
    {
        "title": "Large Codebase Testing (100K LOC)",
        "description": """Test harness on 100,000 line codebase.

Metrics:
- File discovery time
- Documentation completeness
- Session count required
- Resource usage (memory, API calls)
- Total cost

Success Criteria:
- Completes without errors
- Quality maintained
- Cost < $500

Deliverable: Large codebase feasibility study
""",
        "priority": 75,
        "feature": "scalability",
        "estimated_hours": 16,
        "dependencies": []
    },
    {
        "title": "Task Granularity Optimization",
        "description": """Test 10 macro-tasks vs 33 tasks vs 100 micro-tasks.

Hypothesis: Optimal task size balances context and specificity

Experiment:
- Run same project with 3 granularity levels
- Compare quality, speed, cost

Deliverable: Task decomposition best practices
""",
        "priority": 75,
        "feature": "scalability",
        "estimated_hours": 12,
        "dependencies": []
    },

    # 5. MULTI-AGENT COORDINATION (Priority: 70)
    {
        "title": "Parallel Documentation (2 Agents)",
        "description": """Run 2 agents simultaneously on different features.

Experiment:
- Launch 2 agents, different tasks
- Measure coordination via Archon
- Track conflicts and speedup

Success Criteria:
- Zero edit conflicts
- Speedup > 1.7x
- Quality maintained

Deliverable: Parallel agent framework
""",
        "priority": 70,
        "feature": "multi-agent",
        "estimated_hours": 6,
        "dependencies": []
    },
    {
        "title": "Specialized Agent Roles",
        "description": """Test 3 agents: Researcher, Writer, Validator.

Workflow:
1. Researcher gathers info
2. Writer creates docs
3. Validator checks quality

Hypothesis: Specialization improves quality

Deliverable: Multi-role agent architecture
""",
        "priority": 70,
        "feature": "multi-agent",
        "estimated_hours": 8,
        "dependencies": ["Parallel Documentation (2 Agents)"]
    },

    # 6. CODE IMPLEMENTATION (Priority: 65)
    {
        "title": "Implement from PRD (Simple Feature)",
        "description": """Give agent PRD, have it implement code.

Test Case: Simple CRUD feature

Metrics:
- Implementation accuracy (% of spec met)
- Code quality (linting score)
- Test coverage
- Bug count

Success Criteria:
- All tests pass
- Linting score > 8/10
- Coverage > 80%

Deliverable: Code implementation feasibility study
""",
        "priority": 65,
        "feature": "code-implementation",
        "estimated_hours": 8,
        "dependencies": []
    },
    {
        "title": "Test-Driven Development",
        "description": """Agent writes tests first, then implements.

Workflow:
1. Agent reads spec
2. Writes comprehensive tests
3. Implements to pass tests

Success Criteria:
- All tests pass
- Coverage > 90%
- Implementation quality > 8/10

Deliverable: TDD autonomous agent methodology
""",
        "priority": 65,
        "feature": "code-implementation",
        "estimated_hours": 10,
        "dependencies": ["Implement from PRD (Simple Feature)"]
    },

    # 7. LIVING DOCUMENTATION (Priority: 60)
    {
        "title": "Code Change Detection",
        "description": """Agent monitors git repo, detects doc impact.

System:
- Watches for commits
- Analyzes changed files
- Identifies doc sections affected
- Prioritizes updates

Success Criteria:
- Detection accuracy > 90%
- False positive rate < 10%
- Response time < 5 minutes

Deliverable: Code monitoring system
""",
        "priority": 60,
        "feature": "living-documentation",
        "estimated_hours": 6,
        "dependencies": []
    },
    {
        "title": "Automated Doc Updates",
        "description": """Agent automatically updates docs when code changes.

Features:
- Detects code changes
- Updates relevant docs
- Maintains validation records
- Commits changes

Success Criteria:
- Update accuracy > 95%
- No stale references
- Latency < 10 minutes

Deliverable: Living documentation automation
""",
        "priority": 60,
        "feature": "living-documentation",
        "estimated_hours": 10,
        "dependencies": ["Code Change Detection"]
    },

    # 8. HARNESS EVOLUTION (Priority: 95)
    {
        "title": "Checkpointing & Resume System",
        "description": """Add mid-session checkpoints to harness.

Implementation:
- Save state every 5 minutes
- Enable resume from any checkpoint
- Test with intentional crashes

Success Criteria:
- Zero work lost on crash
- Resume time < 30 seconds
- State consistency 100%

Deliverable: PR to harness with checkpointing
""",
        "priority": 95,
        "feature": "harness-evolution",
        "estimated_hours": 4,
        "dependencies": []
    },
    {
        "title": "Multi-Model Orchestration",
        "description": """Route tasks to optimal model (Opus/Sonnet/Haiku).

Strategy:
- Opus for complex analysis
- Sonnet for standard docs
- Haiku for validation

Hypothesis: 50-70% cost reduction, minimal quality loss

Deliverable: Multi-model orchestration framework
""",
        "priority": 95,
        "feature": "harness-evolution",
        "estimated_hours": 6,
        "dependencies": []
    },
    {
        "title": "Quality-Gated Progression",
        "description": """Block task completion if quality thresholds not met.

Quality Gates:
- Validation coverage > 90%
- File references > 5
- No hallucination detected
- Cross-references > 3

Deliverable: Automated quality gate system
""",
        "priority": 95,
        "feature": "harness-evolution",
        "estimated_hours": 5,
        "dependencies": []
    },
    {
        "title": "Local LLM Support",
        "description": """Add support for local LLMs (Ollama, LM Studio).

Implementation:
- Abstract LLM interface
- Ollama adapter
- vLLM adapter
- Tool calling translation

Benefits:
- Complete data privacy
- Zero API costs
- Offline capability

Deliverable: Local LLM harness variant
""",
        "priority": 95,
        "feature": "harness-evolution",
        "estimated_hours": 8,
        "dependencies": []
    },

    # 9. ARCHON EVOLUTION (Priority: 90)
    {
        "title": "Agent Performance Analytics in Archon",
        "description": """Add agent metrics tracking to Archon.

New MCP Tools:
- record_agent_metrics()
- get_performance_trends()
- alert_on_degradation()

Metrics:
- Session duration
- Quality scores
- Retry counts
- Validation coverage

Deliverable: PR to Archon with analytics
""",
        "priority": 90,
        "feature": "archon-evolution",
        "estimated_hours": 6,
        "dependencies": []
    },
    {
        "title": "RAG Knowledge Base Auto-Enrichment",
        "description": """Agents contribute learnings back to RAG.

Workflow:
- Agent completes documentation
- Extracts key patterns/insights
- Adds to knowledge base
- Future agents benefit

Deliverable: Self-enriching knowledge base
""",
        "priority": 90,
        "feature": "archon-evolution",
        "estimated_hours": 8,
        "dependencies": []
    },
    {
        "title": "Multi-Agent Coordination Protocol",
        "description": """Add coordination primitives to Archon.

New MCP Tools:
- acquire_lock()
- release_lock()
- send_message()
- poll_messages()
- detect_conflicts()

Deliverable: PR to Archon with coordination
""",
        "priority": 90,
        "feature": "archon-evolution",
        "estimated_hours": 10,
        "dependencies": []
    },

    # 10. META-RESEARCH (Priority: 50)
    {
        "title": "Prompt Engineering Study",
        "description": """Test 10 prompt variations, measure impact.

Variables:
- Validation requirements
- Example inclusion
- Tone and style
- Structure and format

Deliverable: Prompt engineering guide
""",
        "priority": 50,
        "feature": "meta-research",
        "estimated_hours": 12,
        "dependencies": []
    },
    {
        "title": "Agent Model Comparison",
        "description": """Compare Opus 4.5 vs Sonnet 4.5 vs Haiku.

Metrics:
- Quality by model
- Cost by model
- Speed by model
- Best task types per model

Deliverable: Model selection guide
""",
        "priority": 50,
        "feature": "meta-research",
        "estimated_hours": 10,
        "dependencies": []
    },
]


async def create_project():
    """Create the research project in Archon."""

    async with httpx.AsyncClient(timeout=30.0) as client:
        # Create project
        print("Creating project in Archon...")

        project_data = {
            "title": PROJECT_NAME,
            "description": PROJECT_DESCRIPTION,
            "status": "active",
        }

        response = await client.post(
            f"{ARCHON_BASE_URL}/api/projects",
            json=project_data
        )

        if response.status_code != 201:
            print(f"Error creating project: {response.text}")
            return

        project = response.json()
        project_id = project["id"]
        print(f"✓ Project created: {project_id}")

        # Create META task
        print("\nCreating META tracking task...")

        meta_task = {
            "project_id": project_id,
            "title": "[META] Autonomous AI Research Progress Tracker",
            "description": f"""
Meta task for tracking overall research progress.

Created: {datetime.now().isoformat()}
Total experiments planned: {len(TASKS)}

This task tracks:
- Experiments completed
- Key findings
- Tool improvements shipped
- Papers/reports published

Session handoff notes go here.
""",
            "status": "doing",
            "priority": 100,
            "task_order": 1
        }

        response = await client.post(
            f"{ARCHON_BASE_URL}/api/tasks",
            json=meta_task
        )

        meta_task_result = response.json()
        print(f"✓ META task created: {meta_task_result['id']}")

        # Create research tasks
        print(f"\nCreating {len(TASKS)} research tasks...")

        task_map = {}  # title -> task_id for dependencies

        for idx, task_def in enumerate(TASKS):
            task_data = {
                "project_id": project_id,
                "title": task_def["title"],
                "description": task_def["description"],
                "status": "todo",
                "priority": task_def["priority"],
                "task_order": task_def["priority"],  # Use priority as order
                "labels": [task_def["feature"]],
                "estimated_hours": task_def.get("estimated_hours", 0),
            }

            response = await client.post(
                f"{ARCHON_BASE_URL}/api/tasks",
                json=task_data
            )

            if response.status_code == 201:
                task_result = response.json()
                task_map[task_def["title"]] = task_result["id"]
                print(f"  ✓ [{idx+1}/{len(TASKS)}] {task_def['title']}")
            else:
                print(f"  ✗ Failed: {task_def['title']}")

        # TODO: Set up dependencies (Archon may not have dependency API yet)
        # This would link tasks with dependencies

        print(f"\n{'='*70}")
        print(f"PROJECT CREATED SUCCESSFULLY")
        print(f"{'='*70}")
        print(f"\nProject: {PROJECT_NAME}")
        print(f"ID: {project_id}")
        print(f"Tasks: {len(TASKS)} experiments")
        print(f"META task: {meta_task_result['id']}")
        print(f"\nFeature Areas:")

        features = {}
        for task in TASKS:
            feature = task["feature"]
            features[feature] = features.get(feature, 0) + 1

        for feature, count in sorted(features.items(), key=lambda x: -x[1]):
            print(f"  - {feature}: {count} experiments")

        total_hours = sum(t.get("estimated_hours", 0) for t in TASKS)
        print(f"\nEstimated effort: {total_hours} hours (~{total_hours/40:.1f} weeks)")

        print(f"\n{'='*70}")
        print("NEXT STEPS:")
        print("1. Review tasks in Archon UI")
        print("2. Select Phase 1 experiments to run first")
        print("3. Execute experiments and collect data")
        print("4. Contribute improvements back to open source")
        print(f"{'='*70}")

        return project_id


if __name__ == "__main__":
    print(f"\n{'='*70}")
    print("AUTONOMOUS AI CAPABILITIES RESEARCH")
    print("Creating structured research project in Archon")
    print(f"{'='*70}\n")

    asyncio.run(create_project())

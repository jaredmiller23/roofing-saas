# Claude Code Hooks - Comprehensive Research & Strategy
**Date**: December 12, 2025
**Status**: Research Complete, Ready for Implementation
**Current Usage**: ~5% of capability (only typecheck + lint)

---

## Executive Summary

Claude Code Hooks are a **deterministic, event-driven automation layer** that provides unprecedented control over Claude's behavior. This research reveals we're massively underutilizing this "superpower" feature.

**Key Findings**:
- **10 hook event types** available (we use 2)
- **6 can actively block/control** Claude operations
- **PreToolUse can modify tool inputs** transparently
- **Hooks run in parallel** for distributed validation
- **MCP tools are hookable** for integration control

---

## 1. Complete Hook Event Catalog

| Event | Runs When | Can Block? | Best Use Cases |
|-------|-----------|-----------|----------------|
| **PreToolUse** | Before any tool execution | ✅ YES | Permission gates, input validation, cost checks, test enforcement |
| **PermissionRequest** | User permission dialog shown | ✅ YES | Auto-approve safe tools, deny risky ones |
| **PostToolUse** | After tool completes | ❌ NO | Validators, formatters, logging |
| **UserPromptSubmit** | User submits a prompt | ✅ YES | Secret detection, prompt validation, context injection |
| **Stop** | Claude finishes responding | ✅ YES | Quality gates, verify task completion, force continue |
| **SubagentStop** | Subagent finishes task | ✅ YES | Task validation, multi-agent coordination |
| **SessionStart** | Session begins/resumes | ❌ NO | Environment setup, context injection |
| **SessionEnd** | Session terminates | ❌ NO | Cleanup, analytics, session logging |
| **PreCompact** | Before context compaction | ❌ NO | State preservation, logging |
| **Notification** | Claude sends notifications | ❌ NO | Custom alerts, logging |

---

## 2. Hook Capabilities Matrix

### What Each Hook Can Do

| Capability | PreToolUse | PostToolUse | Stop | UserPromptSubmit |
|------------|-----------|------------|------|-----------------|
| **Block action** | ✅ YES | ❌ NO | ✅ YES | ✅ YES |
| **Modify input** | ✅ YES via `updatedInput` | ❌ NO | ❌ NO | ❌ NO |
| **Add context** | ❌ NO | ✅ YES | ❌ NO | ✅ YES |
| **Force continue** | ❌ NO | ❌ NO | ✅ YES | ❌ NO |
| **Log/audit** | ✅ YES | ✅ YES | ✅ YES | ✅ YES |

### Critical Capability Discovery

**PreToolUse** hooks can return `updatedInput` to **transparently modify tool parameters before execution**:

```json
{
  "hookSpecificOutput": {
    "permissionDecision": "allow",
    "updatedInput": {
      "file_path": "/sanitized/path.txt",
      "content": "sanitized content"
    }
  }
}
```

This enables:
- Transparent input sanitization
- Security enforcement (path validation)
- Convention adherence (auto-formatting file paths)
- Cost optimization (modifying expensive tool params)

---

## 3. Hook JSON Response Format

### Exit Code 0 (Success)
```json
{
  // Common across all hooks
  "continue": true,           // false = force Claude to stop
  "stopReason": "message",    // User-shown reason for stopping
  "suppressOutput": false,    // Hide from transcript
  "systemMessage": "warning", // Show to user

  // PreToolUse specific
  "hookSpecificOutput": {
    "permissionDecision": "allow|deny|ask",
    "permissionDecisionReason": "explanation",
    "updatedInput": { "field": "new_value" }
  },

  // PostToolUse specific
  "decision": "block",
  "reason": "why blocked",
  "additionalContext": "context for Claude",

  // Stop/SubagentStop specific
  "decision": "block",        // Force Claude to continue
  "reason": "why must continue"
}
```

### Exit Code 2 (Blocking Error)
- Prevents tool execution / denies permission / blocks prompt
- Shows stderr to Claude (tool-specific feedback)
- Triggers automatic Claude response

---

## 4. Advanced Enforcement Patterns

### 4.1 Auto-Test Gate (PreToolUse)

**Goal**: Block production code changes unless E2E tests pass

```bash
#!/bin/bash
# .claude/hooks/test-gate.sh

INPUT=$(cat)
TOOL=$(echo "$INPUT" | jq -r '.tool_name')
FILE=$(echo "$INPUT" | jq -r '.tool_input.file_path')

# Only enforce on source files
if [[ ! "$FILE" =~ ^.*/src/.*\.(tsx?|jsx?)$ ]]; then
  exit 0
fi

if [[ "$TOOL" != "Write" && "$TOOL" != "Edit" ]]; then
  exit 0
fi

# Run tests
if npm run test:e2e -- --reporter=json 2>/dev/null | jq '.stats.expected' > /dev/null; then
  echo "✓ E2E tests passed - edit allowed"
  exit 0
else
  echo "E2E tests must pass before editing src/ files" >&2
  exit 2  # Block the tool call
fi
```

### 4.2 Database Migration Safety (PreToolUse)

**Goal**: Validate Supabase migrations follow conventions and warn on destructive operations

```bash
#!/bin/bash
# .claude/hooks/migration-validator.sh

INPUT=$(cat)
FILE=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')
CONTENT=$(echo "$INPUT" | jq -r '.tool_input.content // empty')

# Only check migration files
if [[ ! "$FILE" =~ supabase/migrations/.*\.sql$ ]]; then
  exit 0
fi

# Check timestamp format
if [[ ! "$FILE" =~ [0-9]{14}_[a-z0-9_]+\.sql$ ]]; then
  echo "Migration filename must be: YYYYMMDDHHMMSS_descriptive_name.sql" >&2
  exit 2
fi

# Check for rollback comments
if ! echo "$CONTENT" | grep -q "-- Rollback:"; then
  echo "Migration must include rollback comment" >&2
  exit 2
fi

# Warn on destructive operations (don't block)
if echo "$CONTENT" | grep -qE "DROP TABLE|TRUNCATE|ALTER.*DROP"; then
  cat >&2 << EOF
⚠️  DESTRUCTIVE MIGRATION DETECTED
This migration includes DROP/TRUNCATE operations.
Ensure you have a backup and proper rollback plan.
EOF
fi

exit 0
```

### 4.3 Cost Tracker (PreToolUse)

**Goal**: Track expensive operations and warn on high costs

```python
#!/usr/bin/env python3
# .claude/hooks/cost-tracker.py

import json
import sys
from datetime import datetime
from pathlib import Path

COST_PER_OPERATION = {
    "Task": 0.10,       # Subagent execution
    "WebSearch": 0.03,  # Search operation
    "WebFetch": 0.01,   # URL fetch
}

try:
    hook_data = json.load(sys.stdin)
    tool = hook_data.get("tool_name", "")
    session_id = hook_data.get("session_id", "unknown")

    cost = COST_PER_OPERATION.get(tool, 0)

    if cost > 0:
        # Log cost
        log_dir = Path.home() / ".claude" / "costs"
        log_dir.mkdir(parents=True, exist_ok=True)

        with open(log_dir / f"{session_id}.log", "a") as f:
            f.write(f"{datetime.now().isoformat()} {tool} ${cost:.2f}\n")

        # Warn if expensive
        if cost > 0.05:
            output = {
                "systemMessage": f"💰 {tool} costs ~${cost:.2f}. Budget-conscious? Consider alternatives.",
                "suppressOutput": True
            }
            print(json.dumps(output))

    sys.exit(0)

except Exception:
    # Silent fail - don't block on hook error
    sys.exit(0)
```

### 4.4 Secret Detection (UserPromptSubmit)

**Goal**: Prevent accidental credential exposure in prompts

```python
#!/usr/bin/env python3
# .claude/hooks/secret-detector.py

import json
import re
import sys

SECRET_PATTERNS = [
    (r"(?i)(password|secret|token|api[_-]?key)\s*[:=]", "Potential secret"),
    (r"sk_[a-z0-9]{20,}", "Possible API key"),
    (r"Bearer\s+[a-z0-9._-]{50,}", "Possible auth token"),
    (r"https://[^:]+:[^@]+@", "Credentials in URL"),
]

try:
    hook_data = json.load(sys.stdin)
    prompt = hook_data.get("prompt", "")

    for pattern, description in SECRET_PATTERNS:
        if re.search(pattern, prompt, re.IGNORECASE):
            output = {
                "decision": "block",
                "reason": f"Security: {description} detected. Please rephrase without sensitive info."
            }
            print(json.dumps(output))
            sys.exit(0)

    sys.exit(0)

except Exception:
    sys.exit(0)  # Fail open
```

### 4.5 Quality Gate on Stop (Stop Hook)

**Goal**: Verify all tests pass before allowing session to stop

```python
#!/usr/bin/env python3
# .claude/hooks/stop-verification.sh

import json
import subprocess
import sys

hook_data = json.load(sys.stdin)

# Check if we've already verified (prevent infinite loop)
if hook_data.get("stop_hook_active"):
    sys.exit(0)

# Run E2E test suite
result = subprocess.run(
    ["npm", "run", "test:e2e", "--", "--reporter=json"],
    capture_output=True,
    timeout=300
)

if result.returncode != 0:
    output = {
        "decision": "block",
        "reason": "E2E tests have failures. Fix them before stopping session."
    }
    print(json.dumps(output))

sys.exit(0)
```

---

## 5. Integration with 4-Layer Testing Architecture

```
┌─────────────────────────────────────┐
│ Layer 4: HOOKS (Enforcement)        │ ← DETERMINISTIC
│ ─────────────────────────────────── │
│ ✓ Auto-test gates (PreToolUse)      │
│ ✓ Cost monitoring (PreToolUse)      │
│ ✓ Security validation (UserPromptSubmit)
│ ✓ Migration safety (PreToolUse)     │
│ ✓ Quality gates (Stop)              │
└────────────┬────────────────────────┘
             ↓ ENFORCES
┌─────────────────────────────────────┐
│ Layer 3: SKILLS (Domain Knowledge)  │ ← EXPERTISE
│ ─────────────────────────────────── │
│ .claude/skills/playwright-testing/  │
│ .claude/skills/quickbooks/          │
└────────────┬────────────────────────┘
             ↓ INFORMS
┌─────────────────────────────────────┐
│ Layer 2: SUBAGENTS (Specialization) │ ← DELEGATION
│ ─────────────────────────────────── │
│ .claude/agents/test-runner/         │
│ .claude/agents/debugger/            │
└────────────┬────────────────────────┘
             ↓ EXECUTES
┌─────────────────────────────────────┐
│ Layer 1: RULES (Memory & Context)   │ ← GUIDANCE
│ ─────────────────────────────────── │
│ .claude/rules/*.md (conventions)    │
│ CLAUDE.md (project context)         │
└─────────────────────────────────────┘
```

**How They Work Together**:
1. **Rule** says: "Test everything"
2. **Subagent** executes: "Run E2E tests"
3. **Skill** provides: "Playwright patterns"
4. **Hook** enforces: "Block Write on src/ until tests pass"

Hooks make rules **deterministic and unbypassable**.

---

## 6. Implementation Roadmap

### Phase 1: Foundation (Immediate - 4-6 hours)
**Goal**: Add validation, security, and migration safety

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Write|Edit",
        "description": "Validate TypeScript types",
        "hooks": [{"type": "command", "command": "${CLAUDE_PROJECT_DIR}/.claude/hooks/typecheck.sh"}]
      },
      {
        "matcher": "Write|Edit",
        "description": "Lint code style",
        "hooks": [{"type": "command", "command": "${CLAUDE_PROJECT_DIR}/.claude/hooks/lint.sh"}]
      },
      {
        "matcher": "Write|Edit",
        "description": "Validate migrations",
        "hooks": [{"type": "command", "command": "${CLAUDE_PROJECT_DIR}/.claude/hooks/migration-validator.sh"}]
      }
    ],
    "UserPromptSubmit": [
      {
        "description": "Detect secrets in prompts",
        "hooks": [{"type": "command", "command": "${CLAUDE_PROJECT_DIR}/.claude/hooks/secret-detector.py"}]
      }
    ],
    "Stop": [
      {
        "description": "Verify build succeeds",
        "hooks": [{"type": "command", "command": "${CLAUDE_PROJECT_DIR}/.claude/hooks/build-check.sh"}]
      }
    ]
  }
}
```

**Files to Create**:
- `.claude/hooks/migration-validator.sh` (3-4 hours)
- `.claude/hooks/secret-detector.py` (1-2 hours)
- Update `.claude/settings.json` (30 min)

### Phase 2: Testing Enforcement (Week 1 - 6-8 hours)
**Goal**: Auto-test gates before production changes

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Write|Edit",
        "description": "Block source changes without passing tests",
        "hooks": [{"type": "command", "command": "${CLAUDE_PROJECT_DIR}/.claude/hooks/test-gate.sh", "timeout": 300000}]
      }
    ],
    "Stop": [
      {
        "description": "Verify E2E tests pass before stopping",
        "hooks": [{"type": "command", "command": "${CLAUDE_PROJECT_DIR}/.claude/hooks/e2e-verification.sh", "timeout": 300000}]
      }
    ]
  }
}
```

**Files to Create**:
- `.claude/hooks/test-gate.sh` (4-6 hours)
- `.claude/hooks/e2e-verification.sh` (2-3 hours)

### Phase 3: Cost Optimization (Week 2 - 3-4 hours)
**Goal**: Track and warn on expensive operations

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Task|WebSearch|WebFetch",
        "description": "Track API operation costs",
        "hooks": [{"type": "command", "command": "${CLAUDE_PROJECT_DIR}/.claude/hooks/cost-tracker.py"}]
      }
    ]
  }
}
```

**Files to Create**:
- `.claude/hooks/cost-tracker.py` (3-4 hours with dashboard)

### Phase 4: RLS & Security (Week 3 - 4-6 hours)
**Goal**: Database safety and RLS policy validation

```json
{
  "hooks": {
    "Stop": [
      {
        "description": "Verify RLS policies exist",
        "hooks": [{"type": "command", "command": "${CLAUDE_PROJECT_DIR}/.claude/hooks/rls-audit.sh"}]
      }
    ]
  }
}
```

---

## 7. Best Practices

### When to Use Hooks vs Rules vs Skills

| Scenario | Hook | Rule | Skill |
|----------|------|------|-------|
| Auto-run tests | ✅ PreToolUse | ❌ | ✅ |
| Cost monitoring | ✅ PreToolUse | ❌ | ❌ |
| Documentation | ❌ | ✅ | ❌ |
| Specialized knowledge | ❌ | ❌ | ✅ |
| Permission gating | ✅ PreToolUse | ❌ | ❌ |
| Logging/audit | ✅ PostToolUse | ❌ | ❌ |

### Error Handling Template

```bash
#!/bin/bash
# Template: Safe hook with error handling

set -e  # Exit on error

cleanup() {
  rm -f /tmp/hook-temp-*
}
trap cleanup EXIT

# Parse input safely
if ! INPUT=$(cat); then
  echo "Error: Failed to read input" >&2
  exit 0  # Don't block on hook error
fi

# Validate JSON
if ! echo "$INPUT" | jq . > /dev/null 2>&1; then
  echo "Error: Invalid JSON input" >&2
  exit 0  # Don't block
fi

# Main logic here
TOOL=$(echo "$INPUT" | jq -r '.tool_name')
# ...

exit 0
```

### Performance Considerations

- **Timeout**: 60 seconds default (configurable per command)
- **Parallelization**: All matching hooks run in parallel
- **Deduplication**: Identical commands deduplicated automatically
- **Cost**: 0 cost for blocking decisions (they prevent expensive operations)

---

## 8. Hooks vs Current Implementation

### Current (Minimal)
```json
{
  "PreToolUse": [
    { "matcher": "Write|Edit", "hooks": [{"type": "command", "command": "typecheck.sh"}] },
    { "matcher": "Write|Edit", "hooks": [{"type": "command", "command": "lint.sh"}] }
  ],
  "Stop": [
    { "hooks": [{"type": "command", "command": "build-check.sh"}] }
  ]
}
```
**Coverage**: ~5% of hook capability

### Proposed (Phase 1 Complete)
```json
{
  "PreToolUse": [
    { "matcher": "Write|Edit", "hooks": [{"command": "typecheck.sh"}] },
    { "matcher": "Write|Edit", "hooks": [{"command": "lint.sh"}] },
    { "matcher": "Write|Edit", "hooks": [{"command": "migration-validator.sh"}] }
  ],
  "UserPromptSubmit": [
    { "hooks": [{"command": "secret-detector.py"}] }
  ],
  "Stop": [
    { "hooks": [{"command": "build-check.sh"}] }
  ]
}
```
**Coverage**: ~20% of hook capability

### Proposed (All Phases Complete)
```json
{
  "PreToolUse": [
    { "matcher": "Write|Edit", "hooks": [{"command": "typecheck.sh"}] },
    { "matcher": "Write|Edit", "hooks": [{"command": "lint.sh"}] },
    { "matcher": "Write|Edit", "hooks": [{"command": "test-gate.sh"}] },
    { "matcher": "Write|Edit", "hooks": [{"command": "migration-validator.sh"}] },
    { "matcher": "Task|WebSearch|WebFetch", "hooks": [{"command": "cost-tracker.py"}] }
  ],
  "UserPromptSubmit": [
    { "hooks": [{"command": "secret-detector.py"}] }
  ],
  "Stop": [
    { "hooks": [{"command": "build-check.sh"}] },
    { "hooks": [{"command": "e2e-verification.sh"}] },
    { "hooks": [{"command": "rls-audit.sh"}] }
  ]
}
```
**Coverage**: ~60% of hook capability

---

## 9. Key Discoveries from Research

1. **PreToolUse can modify tool inputs** - Not just block/allow, but actually modify what the tool receives via `updatedInput`

2. **Hooks run in parallel** - All matching hooks execute simultaneously for distributed validation

3. **SessionStart hooks can persist environment** - Using `CLAUDE_ENV_FILE` for persistent env vars

4. **MCP tools are hookable** - Any MCP server's tools can be controlled via `mcp__<server>__<tool>` patterns

5. **Prompt-based hooks use LLM** - New `type: "prompt"` enables context-aware decisions via Haiku

6. **10 hook events total** - SessionStart, SessionEnd, PreCompact are underutilized

7. **Security via hooks is transparent** - Deterministic automation, not conversation

---

## 10. Recommended Next Steps

1. **Create Phase 1 hooks** (immediate):
   - `migration-validator.sh`
   - `secret-detector.py`
   - Update `.claude/settings.json`

2. **Test thoroughly**:
   - Verify hooks don't block legitimate operations
   - Test error handling
   - Measure performance impact

3. **Document for team**:
   - Update CLAUDE.md with hooks section
   - Create team training on hook system

4. **Iterate**:
   - Monitor hook execution logs
   - Refine based on false positives
   - Add more hooks as patterns emerge

---

## 11. Sources

- [Hooks Reference - Claude Code Docs](https://code.claude.com/docs/en/hooks)
- [Hooks Guide - Claude Code Docs](https://code.claude.com/docs/en/hooks-guide)
- [Settings Configuration - Claude Code Docs](https://code.claude.com/docs/en/settings)
- [Claude Code Best Practices - Anthropic](https://www.anthropic.com/engineering/claude-code-best-practices)
- [Automate Workflows with Hooks - GitButler](https://blog.gitbutler.com/automate-your-ai-workflows-with-claude-code-hooks)
- [Advanced Guide - Paul M Duvall](https://www.paulmduvall.com/claude-code-advanced-tips-using-commands-configuration-and-hooks/)

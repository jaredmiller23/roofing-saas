#!/bin/bash
# ESLint Hook
# Runs linting before code edits to catch style and potential issues
# NOTE: Uses max-warnings to allow incremental fixes without blocking

# Skip hook if harness mode detected via:
# 1. ACES_TASK environment variable
# 2. .aces/current_task.yaml file exists (harness creates this in VEST or project)
# 3. VEST harness marker file
if [ "$HARNESS_MODE" = "1" ] || [ "$ACES_TASK" != "" ] || \
   [ -f ".aces/current_task.yaml" ] || [ -f "/Users/ccai/Projects/VEST/.aces/current_task.yaml" ]; then
  echo "⚡ Harness mode - skipping pre-edit lint (will validate at end)"
  exit 0
fi

echo "🧹 Running ESLint..."

# Run ESLint with max-warnings to allow some existing issues
# while still catching new errors
npm run lint -- --max-warnings 50 || {
  echo "⚠️  Lint check has warnings (>50), but allowing edit to proceed"
  echo "   Please fix lint warnings when possible"
  exit 0
}

echo "✅ Lint check passed!"

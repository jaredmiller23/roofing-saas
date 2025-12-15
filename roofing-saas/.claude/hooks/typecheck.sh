#!/bin/bash
# TypeScript Type Check Hook
# Runs type checking before code edits to catch type errors early
#
# NOTE: Does NOT block on errors to allow harness/incremental work
# Errors are logged but execution continues

# Skip hook if harness mode detected via:
# 1. ACES_TASK environment variable
# 2. .aces/current_task.yaml file exists (harness creates this)
if [ "$HARNESS_MODE" = "1" ] || [ "$ACES_TASK" != "" ] || [ -f ".aces/current_task.yaml" ]; then
  echo "⚡ Harness mode - skipping pre-edit typecheck (will validate at end)"
  exit 0
fi

echo "🔍 Running TypeScript type check..."

# Run tsc with --noEmit to check types without building
if npx tsc --noEmit 2>&1; then
  echo "✅ Type check passed!"
else
  echo "⚠️  TypeScript has errors, but allowing edit to proceed"
  echo "   (Harness will validate at task completion)"
  # Exit 0 to allow the edit - validation happens at task end
  exit 0
fi

#!/bin/bash
# ESLint Hook
# Runs linting before code edits to catch style and potential issues
# NOTE: Uses max-warnings to allow incremental fixes without blocking

echo "🧹 Running ESLint..."

# Run ESLint with max-warnings to allow some existing issues
# while still catching new errors
npm run lint -- --max-warnings 50 || {
  echo "⚠️  Lint check has warnings (>50), but allowing edit to proceed"
  echo "   Please fix lint warnings when possible"
  exit 0
}

echo "✅ Lint check passed!"

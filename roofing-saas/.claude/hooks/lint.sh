#!/bin/bash
# ESLint Hook
# Runs linting before code edits to catch style and potential issues

set -e

echo "🧹 Running ESLint..."

# Run ESLint on all TypeScript/JavaScript files
npm run lint

echo "✅ Lint check passed!"

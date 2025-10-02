#!/bin/bash
# TypeScript Type Check Hook
# Runs type checking before code edits to catch type errors early

set -e

echo "🔍 Running TypeScript type check..."

# Run tsc with --noEmit to check types without building
npx tsc --noEmit

echo "✅ Type check passed!"

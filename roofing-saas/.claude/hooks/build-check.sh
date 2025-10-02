#!/bin/bash
# Build Validation Hook
# Ensures code changes don't break the production build

set -e

echo "🏗️  Validating production build..."

# Run Next.js build (this catches build-time errors)
npm run build

echo "✅ Build validation passed!"

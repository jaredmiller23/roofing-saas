#!/bin/bash
# =============================================================================
# ROOFING SAAS - STATUS VALIDATION SCRIPT
# =============================================================================
# Purpose: Output verified project status from actual codebase
# Usage: ./scripts/validate-status.sh
#
# This script replaces manual status tracking in CLAUDE.md
# Run at session start to verify actual state
# =============================================================================

set -e
cd "$(dirname "$0")/.."

echo "=============================================="
echo "  ROOFING SAAS - STATUS VALIDATION"
echo "  $(date '+%Y-%m-%d %H:%M:%S')"
echo "=============================================="
echo ""

# -----------------------------------------------------------------------------
# GIT STATUS
# -----------------------------------------------------------------------------
echo "## GIT STATUS"
echo "Branch: $(git branch --show-current)"
UNCOMMITTED=$(git status --porcelain | wc -l | tr -d ' ')
echo "Uncommitted files: $UNCOMMITTED"
if [ "$UNCOMMITTED" -gt 0 ]; then
    echo "  WARNING: You have uncommitted changes!"
    git status --porcelain | head -5
    [ "$UNCOMMITTED" -gt 5 ] && echo "  ... and $(($UNCOMMITTED - 5)) more"
fi
echo ""

# -----------------------------------------------------------------------------
# BUILD STATUS
# -----------------------------------------------------------------------------
echo "## BUILD STATUS"
if npm run typecheck --silent 2>&1 | grep -q "error"; then
    echo "TypeScript: ERRORS FOUND"
else
    echo "TypeScript: Clean"
fi
echo ""

# -----------------------------------------------------------------------------
# E2E TEST COUNT
# -----------------------------------------------------------------------------
echo "## E2E TESTS"
if [ -d "e2e" ]; then
    TEST_FILES=$(find e2e -name "*.spec.ts" | wc -l | tr -d ' ')
    TEST_CASES=$(grep -E "^\s*test\(" e2e/*.spec.ts 2>/dev/null | wc -l | tr -d ' ')
    echo "Test files: $TEST_FILES"
    echo "Test cases: $TEST_CASES"
else
    echo "No e2e directory found"
fi
echo ""

# -----------------------------------------------------------------------------
# MIGRATION STATUS
# -----------------------------------------------------------------------------
echo "## MIGRATIONS"
MIGRATION_COUNT=$(ls supabase/migrations/*.sql 2>/dev/null | wc -l | tr -d ' ')
echo "Total migrations: $MIGRATION_COUNT"

# Check for untracked migrations
UNTRACKED_MIGRATIONS=0
for f in supabase/migrations/*.sql; do
    if [ -f "$f" ]; then
        if ! git ls-files --error-unmatch "$f" >/dev/null 2>&1; then
            UNTRACKED_MIGRATIONS=$((UNTRACKED_MIGRATIONS + 1))
            echo "  UNTRACKED: $(basename $f)"
        fi
    fi
done
[ "$UNTRACKED_MIGRATIONS" -eq 0 ] && echo "All migrations tracked in git"
echo ""

# -----------------------------------------------------------------------------
# FEATURE DIRECTORIES
# -----------------------------------------------------------------------------
echo "## FEATURE COMPONENTS"
echo "Checking key feature directories..."
FEATURES=(
    "components/contacts:Contacts"
    "components/projects:Projects"
    "components/pipeline:Pipeline"
    "components/claims:Claims"
    "components/settings:Settings"
    "components/voice:Voice AI"
    "components/signature:E-Signature"
    "lib/campaigns:Campaigns"
    "lib/quickbooks:QuickBooks"
    "lib/twilio:Twilio SMS"
    "lib/resend:Resend Email"
)

for feature in "${FEATURES[@]}"; do
    DIR="${feature%%:*}"
    NAME="${feature##*:}"
    if [ -d "$DIR" ]; then
        FILE_COUNT=$(find "$DIR" -name "*.tsx" -o -name "*.ts" 2>/dev/null | wc -l | tr -d ' ')
        echo "  $NAME: $FILE_COUNT files"
    else
        echo "  $NAME: NOT FOUND"
    fi
done
echo ""

# -----------------------------------------------------------------------------
# SUMMARY
# -----------------------------------------------------------------------------
echo "=============================================="
echo "  VALIDATION COMPLETE"
echo "=============================================="
echo ""
echo "For task status, check Archon:"
echo "  mcp__archon__find_tasks(project_id=\"42f928ef-ac24-4eed-b539-61799e3dc325\")"
echo ""

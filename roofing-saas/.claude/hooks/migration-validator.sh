#!/bin/bash
# Migration Validator Hook
# Validates Supabase migrations follow conventions and warns on destructive operations
# Exit 0 = allow, Exit 2 = block

set -e

# Parse hook input
if ! INPUT=$(cat 2>/dev/null); then
  echo "Error: Failed to read hook input" >&2
  exit 0  # Don't block on hook error
fi

# Validate JSON
if ! echo "$INPUT" | jq . > /dev/null 2>&1; then
  echo "Error: Invalid JSON input" >&2
  exit 0
fi

# Extract tool info
TOOL=$(echo "$INPUT" | jq -r '.tool_name // empty')
FILE=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')
CONTENT=$(echo "$INPUT" | jq -r '.tool_input.content // empty')

# Only validate migration files
if [[ ! "$FILE" =~ supabase/migrations/.*\.sql$ ]]; then
  exit 0  # Not a migration file, allow
fi

# Only validate on Write/Edit operations
if [[ "$TOOL" != "Write" && "$TOOL" != "Edit" ]]; then
  exit 0
fi

# Validation 1: Check timestamp format (YYYYMMDDHHMMSS_description.sql)
FILENAME=$(basename "$FILE")
if [[ ! "$FILENAME" =~ ^[0-9]{14}_[a-z0-9_]+\.sql$ ]]; then
  cat >&2 << 'EOF'
❌ Migration Validation Failed

Filename must follow format: YYYYMMDDHHMMSS_descriptive_name.sql

Example: 20251212150000_add_claims_table.sql

Current filename does not match this pattern.
EOF
  exit 2  # Block the operation
fi

# Validation 2: Check for rollback comment
if ! echo "$CONTENT" | grep -qi "-- Rollback:"; then
  cat >&2 << 'EOF'
❌ Migration Validation Failed

Migration must include a rollback comment explaining how to undo changes.

Required format:
-- Migration: Description of changes
-- Rollback: How to undo these changes

Example:
-- Migration: Add claims table
-- Rollback: DROP TABLE IF EXISTS claims;
EOF
  exit 2  # Block the operation
fi

# Validation 3: Warn on destructive operations (don't block, just warn)
if echo "$CONTENT" | grep -qiE "DROP\s+(TABLE|DATABASE|SCHEMA|INDEX)|TRUNCATE|DELETE\s+FROM.*WHERE|ALTER\s+TABLE.*DROP"; then
  cat >&2 << 'EOF'

⚠️  DESTRUCTIVE MIGRATION DETECTED

This migration includes potentially destructive operations:
- DROP TABLE/DATABASE/SCHEMA/INDEX
- TRUNCATE
- DELETE FROM ... WHERE
- ALTER TABLE ... DROP

Before proceeding:
✓ Verify you have a recent database backup
✓ Test the migration in a development environment
✓ Ensure the rollback procedure is tested
✓ Consider if this should be a data migration with safeguards

The migration will be allowed, but review carefully.
EOF
  # Don't block, just warn
fi

# Validation 4: Check for org_id in new tables
if echo "$CONTENT" | grep -qiE "CREATE\s+TABLE"; then
  if ! echo "$CONTENT" | grep -qi "org_id"; then
    cat >&2 << 'EOF'

⚠️  MULTI-TENANT WARNING

New table detected without org_id field.

For multi-tenant isolation, most tables should include:
  org_id UUID NOT NULL REFERENCES organizations(id)

If this is intentional (system table, lookup table), you can ignore this warning.
EOF
    # Don't block, just warn
  fi
fi

# All validations passed
echo "✓ Migration validation passed: $FILENAME" >&2
exit 0

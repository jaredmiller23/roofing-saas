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

# Validation 5: Check for ambiguous column/variable references in PL/pgSQL
# This catches the pattern: WHERE column = column (likely should be column = variable)
if echo "$CONTENT" | grep -qiE "LANGUAGE\s+plpgsql"; then
  # Check for pattern where same identifier appears on both sides of = in WHERE clause
  # Common bug: DECLARE status_value TEXT; then WHERE status_value = status_value
  if echo "$CONTENT" | grep -qE "WHERE[^;]*[a-z_]+\s*=\s*\1\b"; then
    cat >&2 << 'EOF'

⚠️  POTENTIAL SQL BUG DETECTED

This migration contains a PL/pgSQL function with a potentially ambiguous reference.

Common bug pattern: Variable declared with same name as a column
  DECLARE status_value TEXT;
  ...
  WHERE status_value = status_value  -- Compares column to itself!

Fix: Rename variable with prefix (e.g., current_status_value, p_status_value)
  DECLARE current_status_value TEXT;
  ...
  WHERE status_value = current_status_value  -- Now unambiguous

Please verify all WHERE clauses distinguish columns from variables.
EOF
    # Don't block, just warn (pattern matching isn't perfect)
  fi

  # More specific check: common problematic variable names
  for varname in "status_value" "stage" "status" "type" "name" "value"; do
    if echo "$CONTENT" | grep -qiE "DECLARE[^;]*\b${varname}\s+TEXT" && \
       echo "$CONTENT" | grep -qiE "WHERE[^;]*\b${varname}\s*=\s*${varname}\b"; then
      cat >&2 << EOF

❌ LIKELY BUG: Ambiguous column reference detected

Variable '${varname}' is declared and then used as '${varname} = ${varname}' in a WHERE clause.
This compares a column to itself, not column to variable.

Fix: Rename the variable to avoid ambiguity:
  DECLARE current_${varname} TEXT;  -- or v_${varname}, p_${varname}
  ...
  WHERE ${varname} = current_${varname}
EOF
      exit 2  # Block - this is almost certainly a bug
    fi
  done
fi

# All validations passed
echo "✓ Migration validation passed: $FILENAME" >&2
exit 0

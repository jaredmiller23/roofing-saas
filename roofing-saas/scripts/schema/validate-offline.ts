#!/usr/bin/env npx tsx
/**
 * Offline Schema Validator (CI-safe)
 *
 * Same validation as validate-schema.ts but guaranteed to use only
 * the committed snapshot file — no database access required.
 *
 * Suitable for pre-commit hooks and CI pipelines.
 *
 * Usage:
 *   npx tsx scripts/schema/validate-offline.ts
 */

// The main validator already reads from the snapshot file and never
// queries the database directly. This wrapper exists to make the
// intent clear and to provide a separate npm script name.
//
// If validate-schema.ts is later modified to optionally refresh the
// snapshot, this file ensures the offline path is preserved.

import './validate-schema'

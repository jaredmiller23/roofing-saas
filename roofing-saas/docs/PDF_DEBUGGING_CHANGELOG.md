# PDF Generation Debugging - Complete Changelog

**Date**: December 18-19, 2025
**Original Issue**: PDF generation timing out on Vercel deployment
**Final Solution**: Defer PDF generation to post-signing (avoids Chromium entirely for main flow)

---

## Executive Summary

### The Problem
PDF generation using Chromium/Puppeteer was failing on Vercel with two errors:
1. `libnss3.so: cannot open shared object file` (Node 22 missing shared libraries)
2. `FUNCTION_INVOCATION_TIMEOUT` (Vercel free tier 10s limit, Chromium needs 15-30s)

### The Solution
Defer PDF generation to post-signing. The signing page already has a "Fields Only View" fallback when no PDF exists. The final signed PDF is generated using `pdf-lib` (pure JavaScript, no Chromium needed).

### What's Left to Clean Up
Several debugging artifacts and configuration changes remain that may or may not be needed.

---

## Original State (Before Debugging)

**Commit**: `2cdf864` - "fix(signatures): Enable PDF generation from HTML templates"

### package.json
```json
{
  "dependencies": {
    "@sparticuz/chromium-min": "^129.0.0",
    "puppeteer": "^24.33.1",
    "puppeteer-core": "^23.11.1"
  }
  // NO "engines" field
}
```

### next.config.ts
- NO `serverExternalPackages` configuration

### Files
- NO `.node-version` file
- NO debug scripts
- NO debug API endpoints

---

## Current State (After All Changes)

**Commit**: `ea3cad7` - "feat(signatures): E-Signature Phase 1.2"

### package.json
```json
{
  "engines": {
    "node": "20.x"
  },
  "dependencies": {
    "@sparticuz/chromium": "^129.0.0",
    "puppeteer-core": "^23.11.1"
  }
  // puppeteer (full) REMOVED
  // @sparticuz/chromium-min REMOVED
}
```

### next.config.ts
```typescript
serverExternalPackages: ['puppeteer-core', '@sparticuz/chromium'],
```

### New Files Added
- `.node-version` (contains "20")
- `app/api/debug-node/route.ts` (debug endpoint)
- `scripts/test-pdf-generation.ts`
- `scripts/test-pdf-node20.mjs`
- `scripts/validate-pdf-generation.ts`
- 12 `validation-*.png` screenshot files
- `lib/storage/signature-pdfs-server.ts`
- `supabase/migrations/20251219024844_add_field_completion_tracking.sql`

---

## Chronological Change Log

### Phase 1: Initial PDF Implementation (Before Errors)

| Commit | Description |
|--------|-------------|
| `2cdf864` | Enable PDF generation from HTML templates - initial implementation |

**What was added:**
- `lib/pdf/html-to-pdf.ts` - Puppeteer-based PDF generation
- `app/api/signature-documents/generate-pdf/route.ts` - PDF generation endpoint
- Template merging in document creation route

---

### Phase 2: First Error - libnss3.so Missing

**Error**: `libnss3.so: cannot open shared object file: No such file or directory`
**Root Cause**: Vercel Node 22 runtime missing shared libraries required by Chromium

| Commit | Change | File(s) | Rationale |
|--------|--------|---------|-----------|
| `33b8b4b` | Switch from `chromium-min` to `chromium` (full) | `package.json`, `lib/pdf/html-to-pdf.ts` | Full package bundles required libraries |
| `b6e49e0` | Simplify Chromium config | `lib/pdf/html-to-pdf.ts` | Use built-in args |
| `3b2d7af` | Add serverless config | `next.config.ts` | Add `serverExternalPackages` |

---

### Phase 3: Node Version Fix

**Discovery**: `@sparticuz/chromium` requires Node 20.x, Vercel was using Node 22

| Commit | Change | File(s) | Rationale |
|--------|--------|---------|-----------|
| `218e02c` | Add `.node-version` file | `.node-version` | Force Node 20 on Vercel |
| `d016b34` | Add engines to package.json | `package.json` | Specify Node 20.x requirement |

**User Action Required**: Changed Vercel Project Settings → General → Node.js Version to 20.x

---

### Phase 4: Package Oscillation (Trial and Error)

| Commit | Change | Rationale |
|--------|--------|-----------|
| `82eb19f` | Switch to chromium-min with remote binary | Try remote binary approach |
| `54be7c0` | Revert to chromium full package | Remote binary didn't work |
| `6c564bb` | Correct Chromium pack URL | Fix URL suffix |
| `922357f` | Trigger redeploy | Force Vercel to use new config |

---

### Phase 5: Debug Artifacts Added

| Commit | Change | Files Added |
|--------|--------|-------------|
| `4b71990` | Add Node version check endpoint | `app/api/debug-node/route.ts` |
| Various | Add test scripts | `scripts/test-pdf-generation.ts`, `scripts/test-pdf-node20.mjs`, `scripts/validate-pdf-generation.ts` |
| Various | Add validation screenshots | 12 `validation-*.png` files |

---

### Phase 6: Second Error - Timeout

**Error**: `FUNCTION_INVOCATION_TIMEOUT`
**Root Cause**: Vercel free tier has 10-second timeout, Chromium cold start takes 15-30 seconds

| Commit | Change | File(s) | Rationale |
|--------|--------|---------|-----------|
| `895a803` | Remove full `puppeteer` package | `package.json` | 300MB package was causing deploy issues |

---

### Phase 7: Final Solution - Defer PDF Generation

**Insight**: The signing page already has a "Fields Only View" fallback. PDF is only needed after signing, and the download endpoint already uses `pdf-lib` (no Chromium).

| Commit | Change | File(s) | Rationale |
|--------|--------|---------|-----------|
| `9d913ca` | Defer PDF generation to post-signing | `app/api/signature-documents/route.ts` | Avoid Chromium entirely for document creation |

**Key Changes in `route.ts`:**
- Removed imports for `generateProfessionalPDF`, `mergeTemplateWithContactAndProject`, `uploadSignaturePdfFromServer`
- Removed `maxDuration = 60` (no longer needed)
- Set `file_url: null` for template-based documents
- PDF generated after signing using `pdf-lib`

---

### Phase 8: E-Signature Phase 1.2 (Separate Feature Work)

| Commit | Change | File(s) |
|--------|--------|---------|
| `ea3cad7` | Add field completion tracking + signed email notifications | Multiple files |

**New Features:**
- `completed_fields` JSONB column in `signatures` table
- `notify_signers_on_complete` boolean in `signature_documents` table
- "Document Signed" email notification template

---

## Files to Review for Cleanup

### Definitely Remove (Debug Artifacts)

| File | Purpose | Action |
|------|---------|--------|
| `app/api/debug-node/route.ts` | Debug endpoint showing Node version | DELETE |
| `scripts/test-pdf-generation.ts` | PDF test script | DELETE |
| `scripts/test-pdf-node20.mjs` | PDF test script for Node 20 | DELETE |
| `scripts/validate-pdf-generation.ts` | PDF validation script | DELETE |
| `validation-*.png` (12 files) | Debug screenshots | DELETE |

### Possibly Remove (May Not Be Needed)

| File/Setting | Current State | Consider |
|--------------|---------------|----------|
| `.node-version` | Contains "20" | May not be needed if not using Chromium |
| `package.json` engines | `"node": "20.x"` | May not be needed if not using Chromium |
| `@sparticuz/chromium` | Still in dependencies | Only needed for template preview (which times out anyway) |
| `puppeteer-core` | Still in dependencies | Only needed for template preview |
| `serverExternalPackages` in next.config.ts | Configured for puppeteer/chromium | Only needed if keeping packages |
| `lib/storage/signature-pdfs-server.ts` | Server-side upload helper | May still be useful |

### Keep (Part of Final Solution or Features)

| File | Purpose |
|------|---------|
| `app/api/signature-documents/route.ts` | Updated to defer PDF generation |
| `lib/email/signature-reminder-templates.ts` | Added signed notification template |
| `app/api/signature-documents/[id]/sign/route.ts` | Updated with completed_fields + email |
| `supabase/migrations/20251219024844_*.sql` | Database migration for Phase 1.2 |

---

## Decision Matrix: What To Do

### Option A: Minimal Cleanup (Keep Chromium for Future Use)

Keep the Chromium packages and Node 20 config in case you want to use the template preview feature later (requires Vercel Pro).

**Remove only:**
- Debug endpoint
- Debug scripts
- Validation screenshots

### Option B: Full Cleanup (Remove Chromium Entirely)

Remove all Chromium-related code since it doesn't work on Vercel free tier anyway.

**Remove:**
- Everything in Option A
- `.node-version` file
- `engines` from package.json
- `@sparticuz/chromium` from dependencies
- `puppeteer-core` from dependencies
- `serverExternalPackages` from next.config.ts
- `lib/pdf/html-to-pdf.ts` (or mark as deprecated)
- `app/api/signature-documents/generate-pdf/route.ts` (or return error message)

### Option C: Revert Everything Except Final Solution

Go back to commit `2cdf864` and apply only the necessary changes:
1. The route.ts change to defer PDF generation
2. The Phase 1.2 features (migration, email, completed_fields)

This is the cleanest but requires careful cherry-picking.

---

## Revert Commands (If Needed)

### Remove Debug Files
```bash
rm -f app/api/debug-node/route.ts
rm -f scripts/test-pdf-generation.ts
rm -f scripts/test-pdf-node20.mjs
rm -f scripts/validate-pdf-generation.ts
rm -f validation-*.png
rmdir app/api/debug-node
```

### Remove Node Version Constraints
```bash
rm -f .node-version
# Then edit package.json to remove "engines" field
```

### Remove Chromium Packages
```bash
npm uninstall @sparticuz/chromium puppeteer-core
# Then remove serverExternalPackages from next.config.ts
```

### Full Revert to Pre-Debug State (Nuclear Option)
```bash
# WARNING: This will lose Phase 1.2 features
git revert --no-commit ea3cad7..2cdf864
git commit -m "Revert all PDF debugging changes"

# Then manually apply the desired changes:
# 1. The route.ts deferral fix
# 2. Phase 1.2 migration and features
```

---

## Vercel Configuration Notes

The user changed Vercel Project Settings:
- **Node.js Version**: Changed from default (22?) to 20.x

If removing Node 20 requirement, consider changing this back in Vercel settings.

---

## Summary of Commits (Chronological)

| Commit | Type | Description | Keep? |
|--------|------|-------------|-------|
| `2cdf864` | Feature | Enable PDF generation from HTML templates | Base |
| `33b8b4b` | Fix | Switch to @sparticuz/chromium full pkg | Maybe |
| `b6e49e0` | Fix | Simplify Chromium config | Maybe |
| `3b2d7af` | Fix | Puppeteer/Chromium serverless config | Maybe |
| `218e02c` | Fix | Add .node-version file | Maybe |
| `d016b34` | Fix | Force Node 20.x in package.json | Maybe |
| `82eb19f` | Fix | Switch to chromium-min (reverted) | No |
| `54be7c0` | Fix | Revert to chromium full | Maybe |
| `6c564bb` | Fix | Correct Chromium pack URL | Maybe |
| `922357f` | Chore | Trigger redeploy | No |
| `1bc4637` | Chore | Remove temp PDF test scripts | No |
| `4b71990` | Debug | Add Node version check endpoint | **DELETE** |
| `895a803` | Fix | Remove full puppeteer pkg | Yes |
| `9d913ca` | **Fix** | **Defer PDF generation to post-signing** | **YES** |
| `ea3cad7` | **Feature** | **E-Signature Phase 1.2** | **YES** |

---

## Questions for User Decision

1. **Do you want the template preview feature to work?** (Requires Vercel Pro for 60s timeout)
   - If NO → Remove all Chromium packages
   - If YES → Keep packages, upgrade Vercel later

2. **Should Node 20 be enforced project-wide?**
   - If using Chromium → Yes, keep Node 20
   - If removing Chromium → Probably not needed

3. **What level of cleanup do you want?**
   - Minimal (just debug artifacts)
   - Moderate (debug + unused packages)
   - Full (revert and cherry-pick)

---

*Document created by Claude Code on December 19, 2025*

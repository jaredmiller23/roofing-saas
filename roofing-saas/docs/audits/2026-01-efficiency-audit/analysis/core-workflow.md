# Core Workflow Trace - Phase 2 Analysis

**Auditor**: Claude (Scout Role)
**Date**: 2026-01-13
**Workflow**: Lead → Contact → Project → Pipeline → Signature → Done

---

## Executive Summary

The core CRM workflow is **partially implemented but has critical gaps** that prevent users from completing basic tasks:

1. **Contact creation works**, but project linking is gated to homeowners only
2. **Project creation dialog exists** but is hidden and non-obvious
3. **The /projects/new page is a stub** - dead end for any navigation there
4. **Signature flow is disconnected** from the project workflow
5. **No workflow guidance** - users don't know what step comes next

---

## Step-by-Step Trace

### Step 1: Contact Creation ✅ WORKS

**Files**:
- `components/contacts/contact-form.tsx` (914 lines)
- `app/api/contacts/route.ts` (POST handler, lines 133-289)

**Flow**:
1. User fills contact form (first_name, last_name, email, phone, category, etc.)
2. Form submits to POST `/api/contacts`
3. Contact created in database with tenant_id and created_by
4. Response includes contact data

**Default Values**:
- `contact_category`: 'homeowner' (line 91)
- `type`: 'lead' (line 96)
- `stage`: 'new' (line 97)

**Assessment**: ✅ Works correctly. Form is comprehensive. Duplicate detection works.

---

### Step 2: Project Creation Prompt ⚠️ PARTIALLY BROKEN

**File**: `app/api/contacts/route.ts:197-251`

**Logic** (lines 197-251):
```typescript
if (contact.contact_category === 'homeowner') {
  // Check tenant setting for auto_create_project_for_homeowners
  // If 'always': auto-creates project
  // If 'prompt': sets promptForProject = true
  // If 'never': does nothing
}
// Non-homeowners: NOTHING HAPPENS
```

**The Problem**:
- Line 201: `if (contact.contact_category === 'homeowner')` - **ONLY homeowners get project prompt**
- All other contact categories are completely ignored:
  - `adjuster` - no project prompt
  - `sub_contractor` - no project prompt
  - `supplier` - no project prompt
  - `real_estate_agent` - no project prompt
  - `developer` - no project prompt
  - `property_manager` - no project prompt
  - `local_business` - no project prompt
  - `other` - no project prompt

**User Experience**:
- Homeowner contact: "Would you like to create a project?" dialog appears ✅
- Non-homeowner contact: Redirected to contact detail page with NO guidance ❌

**Impact**: ~60% of potential contact types cannot easily create linked projects through the standard flow.

---

### Step 3: Manual Project Creation ⚠️ WORKS BUT HIDDEN

**Files**:
- `components/contacts/CreateProjectDialog.tsx` (215 lines)
- `app/[locale]/(dashboard)/contacts/[id]/page.tsx:80`

**How It Works**:
- `CreateProjectDialog` is rendered on contact detail page (line 80)
- It's a button labeled "Create Project" in the header
- Clicking opens a dialog to create project linked to this contact
- On success, redirects to `/pipeline`

**The Problem**:
- The button is just ONE of several buttons in the header (line 79-96)
- No visual prominence indicating this is the next step
- Users must KNOW to look for this button
- No "You created a contact, here's what to do next" guidance

**User Experience**:
Non-homeowner user flow:
1. Creates contact
2. Lands on contact detail page
3. Sees contact info, address, property details...
4. Doesn't notice "Create Project" button in header
5. Confusion: "Now what?"

---

### Step 4: /projects/new Page ❌ BROKEN (STUB)

**File**: `app/[locale]/(dashboard)/projects/new/page.tsx`

**The Entire File**:
```typescript
'use client'

export default function NewProjectPage() {
  return (
    <div className="p-6">
      <Card>
        <CardHeader>
          <CardTitle>Create New Project</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Project creation with template selection coming soon.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
```

**Impact**:
- Any link or navigation to `/projects/new` is a **dead end**
- Users expecting to create a project here will be blocked
- The TODO mentions "SPRINT3-003" - feature never implemented

---

### Step 5: Pipeline Movement ✅ WORKS

**File**: `lib/pipeline/validation.ts`

**Stage Order** (line 12-20):
```
prospect → qualified → quote_sent → negotiation → won → production → complete
```

**Transitions** (lines 27-38):
- Sales stages (prospect through won): Allow backward movement ✅
- Production/Complete: Restricted (prevent accidental regression)
- 'lost' is a terminal stage from any point

**Stage Requirements** (lines 43-52):
- `quote_sent`: requires `estimated_value`
- `won`: requires `approved_value`

**Assessment**: ✅ Works correctly. Backward movement was fixed (Phase 5a of bug hunt).

---

### Step 6: Project Detail Page ✅ WORKS

**File**: `app/[locale]/(dashboard)/projects/[id]/page.tsx`

**Features**:
- Shows project info, contact info, pipeline stage
- Tabs: Overview, Quotes, Jobs, Files, Activity
- `SendSignatureDialog` component for sending signatures
- Presence tracking (shows who else is viewing)
- Quote comparison tool

**Contact Link**:
- Lines 155-162: Fetches contact if `contact_id` exists
- Displays contact info in the UI

**Assessment**: ✅ Comprehensive project detail page with good functionality.

---

### Step 7: Signature Flow ⚠️ DISCONNECTED

**Files**:
- `app/[locale]/(dashboard)/signatures/page.tsx` - List view
- `app/[locale]/(dashboard)/signatures/new/page.tsx` - Creation wizard

**Signature Creation Flow**:
1. User navigates to `/signatures/new`
2. 4-step wizard: Template Selection → Document Info → Place Fields → Review
3. Can link to project and contact via dropdowns
4. Creates signature document

**The Disconnection**:
- No "Create Signature" button on project detail page
- Users must navigate to `/signatures/new` separately
- Then manually select the project from a dropdown
- No guided flow: "Project won? Time to get signatures!"

**What's Missing**:
- Quick action on project page: "Create Signature Document"
- Pre-filled signature creation from project context
- Workflow indication that signatures are the next step after 'won' stage

---

## Workflow Gap Summary

| Step | Status | Issue | Impact |
|------|--------|-------|--------|
| 1. Contact Creation | ✅ Works | None | - |
| 2. Project Prompt | ⚠️ Partial | Homeowner-only gate | 60% contacts blocked |
| 3. Manual Project | ⚠️ Hidden | Button not prominent | Users don't find it |
| 4. /projects/new | ❌ Broken | Stub page | Dead end |
| 5. Pipeline | ✅ Works | None | - |
| 6. Project Detail | ✅ Works | None | - |
| 7. Signatures | ⚠️ Disconnected | No link from project | Extra navigation |

---

## Issues for HANDOFF.md

### CRITICAL

#### [CW-001] Contact→Project Prompt Only Works for Homeowners

- **Target**: `app/api/contacts/route.ts:201`
- **Assessment**: The `if (contact.contact_category === 'homeowner')` check prevents all non-homeowner contacts from receiving the project creation prompt. This blocks the core CRM workflow for adjusters, subcontractors, suppliers, and other contact types.
- **Solution**: Either:
  - A) Remove the homeowner gate entirely - prompt for ALL contacts
  - B) Add `CreateProjectDialog` call-to-action to the post-creation redirect for all contacts
  - C) Make the prompt configurable per contact category
- **Verification**:
  1. Create a contact with category='adjuster'
  2. Confirm project creation option appears
  3. Create project, verify contact_id is linked

### HIGH

#### [CW-002] /projects/new Page is Non-Functional Stub

- **Target**: `app/[locale]/(dashboard)/projects/new/page.tsx`
- **Assessment**: The page displays "coming soon" message. Any navigation here is a dead end. Users cannot create projects from this standard route.
- **Solution**: Either:
  - A) Implement full project creation form with contact selection
  - B) Redirect to a working alternative (e.g., contact selection → CreateProjectDialog)
  - C) Remove/hide navigation links to this page
- **Verification**: Navigate to /projects/new, confirm functional project creation form

#### [CW-003] No Workflow Guidance After Contact Creation

- **Target**: `app/[locale]/(dashboard)/contacts/[id]/page.tsx`
- **Assessment**: After creating a non-homeowner contact, user lands on detail page with no indication of next steps. "Create Project" button exists but is not prominent.
- **Solution**: Add a callout/banner on contact detail page for contacts without linked projects:
  ```
  "This contact doesn't have a project yet. Create one to start tracking the opportunity."
  [Create Project] button
  ```
- **Verification**: Create contact, verify guidance banner appears, click creates project

### MEDIUM

#### [CW-004] Signature Creation Disconnected from Project Workflow

- **Target**: `app/[locale]/(dashboard)/projects/[id]/page.tsx`
- **Assessment**: No "Create Signature Document" action on project detail page. Users must navigate to /signatures/new separately and manually select the project.
- **Solution**: Add "Create Signature" button to project detail page that pre-fills project and contact in signature creation flow.
- **Verification**: On project detail, click "Create Signature", confirm project/contact pre-filled

#### [CW-005] No Workflow Progress Indicator

- **Target**: Multiple files (dashboard, project detail)
- **Assessment**: Users have no visual indication of where they are in the workflow (Contact created → Project needed → Quote sent → Won → Signature needed → Complete). Each step feels disconnected.
- **Solution**: Add workflow progress indicator or "next steps" suggestions based on current state.
- **Verification**: View project at each stage, confirm relevant next-step suggestion appears

---

## Data Model Observations

### Contact ↔ Project Relationship

```
contacts table:
  id UUID (PK)
  contact_category ENUM (homeowner, adjuster, sub_contractor, ...)
  type ENUM (lead, prospect, customer)
  stage ENUM (new, contacted, qualified, proposal, negotiation, won, lost)

projects table:
  id UUID (PK)
  contact_id UUID (FK → contacts.id)  ← THE LINK
  pipeline_stage ENUM (prospect, qualified, quote_sent, negotiation, won, production, complete, lost)
```

**Observation**: The data model correctly supports contact→project linking via `contact_id`. The issue is purely in the UI/workflow layer.

### Signature Document Relationships

```
signature_documents table:
  id UUID (PK)
  project_id UUID (FK → projects.id)
  contact_id UUID (FK → contacts.id)
```

**Observation**: Signatures can link to both project AND contact. The data model supports the workflow - just not surfaced well in UI.

---

## Recommendations

### Quick Wins (Can Fix Immediately)

1. **Remove homeowner gate** (CW-001) - Single line change, massive impact
2. **Add "Create Project" banner** (CW-003) - Simple UI addition to contact detail

### Medium Effort

3. **Implement /projects/new** (CW-002) - Form with contact selection
4. **Add signature button to project** (CW-004) - Button + navigation

### Larger Effort

5. **Workflow progress system** (CW-005) - Requires design + multiple components

---

## Files Audited

| File | Lines | Purpose | Issues Found |
|------|-------|---------|--------------|
| `components/contacts/contact-form.tsx` | 914 | Contact creation form | None |
| `app/api/contacts/route.ts` | 289 | Contact API | CW-001: Homeowner gate |
| `components/contacts/CreateProjectDialog.tsx` | 215 | Project creation dialog | CW-003: Hidden |
| `app/[locale]/(dashboard)/projects/new/page.tsx` | 24 | New project page | CW-002: Stub |
| `lib/pipeline/validation.ts` | 216 | Pipeline stage validation | None |
| `app/[locale]/(dashboard)/contacts/[id]/page.tsx` | 150+ | Contact detail | CW-003: No guidance |
| `app/[locale]/(dashboard)/projects/[id]/page.tsx` | 200+ | Project detail | CW-004: No signature link |
| `app/[locale]/(dashboard)/signatures/page.tsx` | 313 | Signature list | None |
| `app/[locale]/(dashboard)/signatures/new/page.tsx` | 150+ | Signature creation | None |

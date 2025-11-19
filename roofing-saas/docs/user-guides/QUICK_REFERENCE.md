# Quick Reference Guide

**Tennessee Roofing SaaS Platform**
**Last Updated**: November 18, 2025

---

## Common Tasks Cheat Sheet

### Create New Contact

```
1. Click "Contacts" → "+ New Contact"
2. Fill: First Name, Last Name, Email, Phone
3. Select Type & Category
4. Click "Create Contact"
```

**Shortcut**: `Ctrl+N` (Mac: `⌘N`)

---

### Create New Project

```
1. Click "Projects" → "+ New Project"
2. Fill: Project Name, Contact, Stage, Value
3. Click "Create Project"
```

**Shortcut**: `Ctrl+Shift+N`

---

### Send Email

```
1. Open contact → Click "Email" button
2. Write email or select template
3. Click "Send"
```

**Shortcut**: `Ctrl+E` (Mac: `⌘E`)

---

### Send SMS

```
1. Open contact → Click "SMS" button
2. Type message (max 160 chars)
3. Click "Send"
```

---

### Log a Call

```
1. Go to "Call Logs" → "+ Log Call"
2. Fill: Direction, Phone, Outcome, Notes
3. Click "Save"
```

**Shortcut**: `Ctrl+L`

---

### Upload Document

```
1. Open contact/project → "Documents" tab
2. Click "+ Upload"
3. Select file, add name/type
4. Click "Upload"
```

---

### Request E-Signature

```
1. Find PDF in Documents tab
2. Click "Request Signature"
3. Enter signer email, place signature fields
4. Click "Send for Signature"
```

---

### Create Invoice (QuickBooks)

```
1. Open project → "Billing" tab
2. Click "Create Invoice"
3. Add line items, review total
4. Click "Create Invoice"
```

---

### Log Door Knock (Mobile)

```
1. Open territory map
2. Tap "+ Drop Pin" button
3. Select disposition, add notes
4. Check "Create Lead" if interested
5. Tap "Save"
```

---

### Search Anything

**Shortcut**: `Ctrl+K` (Mac: `⌘K`)

Global search box appears - search contacts, projects, documents, etc.

---

## Pipeline Stages

| Stage | What It Means |
|-------|---------------|
| **Lead** | New inquiry, not yet contacted |
| **Contacted** | Initial outreach made |
| **Qualified** | Needs confirmed, budget verified |
| **Proposal** | Estimate/quote sent |
| **Contract** | Agreement signed, job scheduled |
| **Installation** | Work in progress |
| **Complete** | Job finished, payment collected |

---

## Contact Types & Categories

### Types (Sales Stage)
- **Lead**: Potential customer
- **Customer**: Active/past customer
- **Partner**: Referral source, vendor

### Categories (Role)
- Homeowner
- Adjuster (Insurance)
- Sub Contractor
- Real Estate Agent
- Developer
- Property Manager
- Local Business
- Other

---

## Door Knock Dispositions

| Disposition | Meaning |
|-------------|---------|
| **Interested** | Wants more info, potential lead |
| **Not Interested** | Declined service |
| **Not Home** | No answer, try again later |
| **Call Back** | Requested follow-up |
| **Already Serviced** | Has roofer or recent work done |
| **No Access** | Gated, locked, unavailable |

---

## Email/SMS Variables

Use in templates - auto-replace with actual data:

| Variable | Replaces With |
|----------|---------------|
| `{{contact_name}}` | Contact's full name |
| `{{first_name}}` | Contact's first name |
| `{{company_name}}` | Your company name |
| `{{project_name}}` | Project name |
| `{{user_name}}` | Your name (sender) |
| `{{user_email}}` | Your email |
| `{{user_phone}}` | Your phone |

---

## Mobile App Installation

### iPhone
```
Safari → Share button → Add to Home Screen
```

### Android
```
Chrome → Menu (3 dots) → Install app
```

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+K` (⌘K) | Global search |
| `Ctrl+N` (⌘N) | New contact |
| `Ctrl+Shift+N` | New project |
| `Ctrl+E` (⌘E) | Compose email |
| `Ctrl+L` | Log call |
| `Ctrl+T` | Create task |
| `Ctrl+D` | Go to today (calendar) |
| `Ctrl+/` (⌘/) | Show shortcuts |
| `Esc` | Close modal |

---

## Offline Mode (Mobile)

**Before Going Offline**:
1. Open territory map
2. Wait for full load
3. Map tiles cache locally

**While Offline**:
- ✅ Log knocks
- ✅ Drop pins
- ✅ Take photos
- ✅ Add notes

**Return Online**:
- App auto-syncs queued actions

---

## Voice Assistant Commands

**Activate**: Tap microphone icon

**Examples**:
- "Log a door knock at 123 Main Street, disposition interested"
- "Create a new lead named John Smith with phone 555-1234"
- "Search for John Smith"
- "Add note: homeowner wants call back next week"
- "Move project Smith Roof to proposal stage"

**Deactivate**: Tap "Stop" or say "Stop"

---

## Common Issues & Quick Fixes

### Can't Log In
- Verify email and password
- Use "Forgot Password" to reset
- Check with admin for account status

### Map Not Loading
- Enable location services
- Grant GPS permission
- Reload territory page

### Document Won't Upload
- Check file size (max 10MB)
- Verify file type allowed
- Try different browser

### Sync Stuck (Mobile)
- Force close and reopen app
- Tap "Sync Now" in offline queue
- Check internet connection

---

## Support Contacts

- **Help Center**: Click **?** icon in app
- **Email**: support@roofing-saas.com
- **Phone**: 1-800-ROOFING
- **Hours**: Mon-Fri 8am-6pm CST

---

## Getting Started Checklist

### All Users
- [ ] Complete profile (Settings → Profile)
- [ ] Upload profile photo
- [ ] Set notification preferences
- [ ] Enable two-factor authentication
- [ ] Review team calendar

### Sales Reps
- [ ] Review pipeline stages
- [ ] Set up email/SMS templates
- [ ] Connect QuickBooks (if applicable)
- [ ] Import existing contacts

### Canvassers
- [ ] Install mobile PWA
- [ ] Grant location permission
- [ ] Test voice assistant
- [ ] Preload territory maps
- [ ] Practice offline mode

### Office Staff
- [ ] Set up call logging workflow
- [ ] Create document folder structure
- [ ] Schedule recurring reports
- [ ] Set up email filters

---

**For detailed instructions, see full role-specific guides**:
- [Administrator Guide](./ADMINISTRATOR_GUIDE.md)
- [Sales Rep Guide](./SALES_REP_GUIDE.md)
- [Canvasser Guide](./CANVASSER_GUIDE.md)
- [Office Staff Guide](./OFFICE_STAFF_GUIDE.md)

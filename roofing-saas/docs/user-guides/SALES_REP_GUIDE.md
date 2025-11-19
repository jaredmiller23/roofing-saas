# Sales Rep Guide

**Tennessee Roofing SaaS Platform**
**Role**: Sales Representative
**Last Updated**: November 18, 2025

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Contact Management](#contact-management)
3. [Pipeline & Projects](#pipeline--projects)
4. [Communication](#communication)
5. [Document Management](#document-management)
6. [E-Signature Workflow](#e-signature-workflow)
7. [QuickBooks & Invoicing](#quickbooks--invoicing)
8. [Tips & Best Practices](#tips--best-practices)

---

## Getting Started

### Your Role

As a Sales Rep, you have access to:
- ✅ Contact and lead management
- ✅ Sales pipeline and project tracking
- ✅ Email and SMS communication
- ✅ Document uploads and sharing
- ✅ E-signature requests
- ✅ QuickBooks invoicing (if integrated)
- ✅ Call logging and notes

### Dashboard Overview

After logging in, your dashboard shows:
- **Today's Tasks**: Follow-ups, calls, meetings
- **Active Projects**: Current deals in pipeline
- **Recent Contacts**: Newest leads
- **Activity Feed**: Team updates

---

## Contact Management

### Create a New Contact

1. Click **Contacts** in main navigation
2. Click **+ New Contact** button
3. Fill in contact information:
   - **First Name** (required)
   - **Last Name** (required)
   - **Email**: Primary email address
   - **Phone**: Phone number (auto-formatted)
   - **Type & Category**: Select from combined dropdown
     - Lead-Homeowner, Customer-Adjuster, etc.
   - **Address**: Street, City, State, ZIP
   - **Company**: If this is a business contact
   - **Website**: Company website (optional)
4. Click **Create Contact**

**Tip**: Use the "Organization" checkbox for businesses rather than individuals.

---

### View Contact Details

1. Go to **Contacts**
2. Click on any contact name
3. View tabbed information:
   - **Overview**: Basic contact info
   - **Projects**: Associated deals/jobs
   - **Activities**: Call logs, emails, notes
   - **Documents**: Uploaded files
   - **Notes**: Internal notes

---

### Edit Contact Information

1. Navigate to contact detail page
2. Click **Edit** button (top right)
3. Update any fields
4. Click **Save Changes**

---

### Search & Filter Contacts

#### Search by Name/Email/Phone

1. Go to **Contacts** list
2. Use search bar at top
3. Type name, email, or phone number
4. Results filter automatically

#### Filter by Type/Stage

1. Click **Filters** button
2. Select filters:
   - **Type**: Lead, Customer, Partner
   - **Stage**: New, Contacted, Qualified, etc.
   - **Category**: Homeowner, Adjuster, Sub Contractor
3. Click **Apply Filters**

#### Sort Contacts

- Click column headers to sort:
  - **Name** (A-Z or Z-A)
  - **Created Date** (newest first)
  - **Last Contact** (most recent)

---

### Add Notes to Contact

1. Open contact detail page
2. Go to **Notes** tab
3. Click **+ Add Note**
4. Enter note content
5. Select note type:
   - General
   - Follow-up required
   - Important
6. Click **Save Note**

**Notes are private** - only your team can see them.

---

### Log an Activity

Track interactions with contacts.

#### Log a Call

1. Open contact
2. Go to **Activities** tab
3. Click **+ Log Activity**
4. Select **Phone Call**
5. Fill in:
   - **Direction**: Inbound or Outbound
   - **Duration**: Call length
   - **Outcome**: Answered, Voicemail, No Answer
   - **Notes**: Conversation summary
6. Click **Log Call**

#### Log an Email

1. Go to contact's **Activities** tab
2. Click **+ Log Activity**
3. Select **Email**
4. Fill in:
   - **Subject**: Email subject line
   - **Notes**: Email summary
5. Click **Log Email**

---

## Pipeline & Projects

### Sales Pipeline Stages

Your pipeline stages (default):
1. **Lead**: New inquiry
2. **Contacted**: Initial outreach made
3. **Qualified**: Needs identified
4. **Proposal**: Estimate sent
5. **Contract**: Signed and scheduled
6. **Installation**: Work in progress
7. **Complete**: Job finished

---

### Create a New Project

1. Click **Projects** in navigation
2. Click **+ New Project**
3. Fill in project details:
   - **Project Name**: e.g., "Smith Roof Replacement"
   - **Contact**: Select existing contact
   - **Stage**: Current pipeline stage
   - **Estimated Value**: Dollar amount
   - **Description**: Project scope
   - **Expected Close Date**: Target date
4. Click **Create Project**

---

### View Pipeline Board

1. Navigate to **Pipeline** view
2. See Kanban board with stages
3. Each card shows:
   - Project name
   - Contact name
   - Estimated value
   - Days in current stage

---

### Move Project Through Pipeline

#### Drag & Drop Method

1. Go to **Pipeline** view
2. Click and hold a project card
3. Drag to new stage column
4. Release to drop
5. Auto-saves stage change

#### Manual Update Method

1. Open project detail page
2. Click **Change Stage** dropdown
3. Select new stage
4. Click **Update**
5. Add note about stage change (recommended)

---

### Set Project Value & Close Date

1. Open project
2. Click **Edit**
3. Update:
   - **Estimated Value**: $XX,XXX
   - **Expected Close Date**: Select date
4. Click **Save**

**Tip**: Keep values and dates updated for accurate forecasting.

---

## Communication

### Send an Email

#### From Contact Page

1. Open contact
2. Click **Email** button (top right)
3. Email compose window opens:
   - **To**: Pre-filled with contact email
   - **Subject**: Enter subject
   - **Body**: Compose message
4. Optionally use template:
   - Click **Templates** dropdown
   - Select template
   - Customize as needed
5. Click **Send**

Email is automatically logged in contact's activities.

---

### Send an SMS

#### From Contact Page

1. Open contact
2. Click **SMS** button
3. SMS compose window opens:
   - **To**: Pre-filled with contact phone
   - **Message**: Enter message (max 160 chars)
4. Optionally use template:
   - Click **Templates** dropdown
   - Select template
5. Click **Send**

SMS is automatically logged in contact's activities.

**Note**: Requires Twilio integration. Contact admin if unavailable.

---

### Email Templates

#### Use a Template

1. When composing email, click **Templates**
2. Select from saved templates:
   - Initial Contact
   - Follow-up
   - Proposal Sent
   - Contract Ready
   - Installation Complete
3. Template populates email
4. Customize with contact-specific details
5. Send

#### Variables in Templates

Templates auto-replace variables:
- `{{contact_name}}` → "John Smith"
- `{{project_name}}` → "Roof Replacement"
- `{{user_name}}` → Your name
- `{{company_name}}` → Your company

---

### SMS Templates

Work the same as email templates:
1. Click **SMS** button
2. Click **Templates**
3. Select template
4. Customize
5. Send

---

## Document Management

### Upload a Document

1. Open contact or project
2. Go to **Documents** tab
3. Click **+ Upload Document**
4. Select file from computer
5. Add document details:
   - **Name**: Document title
   - **Type**: Contract, Estimate, Photo, Other
   - **Description**: Optional notes
6. Click **Upload**

**Supported file types**: PDF, DOC, DOCX, JPG, PNG, XLS, XLSX

**Max file size**: 10MB per file

---

### Share a Document

1. Find document in Documents tab
2. Click **Share** button
3. Select sharing method:
   - **Email**: Send as attachment
   - **Link**: Generate shareable link
4. For email:
   - Enter recipient email
   - Add message (optional)
   - Click **Send**
5. For link:
   - Click **Generate Link**
   - Copy link
   - Share via SMS, email, etc.

---

### Organize Documents

#### Create Folders

1. Go to **Documents** tab
2. Click **+ New Folder**
3. Name folder (e.g., "Contracts", "Photos")
4. Click **Create**

#### Move Documents to Folders

1. Select documents (checkboxes)
2. Click **Move to Folder**
3. Select destination folder
4. Click **Move**

---

## E-Signature Workflow

### Request a Signature

1. Open project or contact
2. Go to **Documents** tab
3. Find document to sign (must be PDF)
4. Click **Request Signature**
5. Configure signature request:
   - **Signer Name**: Contact's name
   - **Signer Email**: Where to send
   - **Message**: Custom note to signer
   - **Expiration**: 7, 14, or 30 days
6. Place signature fields:
   - Click **Add Signature Field**
   - Drag field to position on PDF
   - Resize as needed
   - Add more fields if needed (initials, date)
7. Click **Send for Signature**

---

### Track Signature Status

1. Go to **Documents** tab
2. Documents with signature requests show status:
   - **Pending**: Awaiting signature
   - **Signed**: Completed
   - **Expired**: Signature window closed
   - **Declined**: Signer declined

---

### View Signed Document

1. Find signed document
2. Click **View Signed PDF**
3. Download includes:
   - Original document
   - Signature(s)
   - Timestamp
   - Audit trail

---

### Resend Signature Request

1. Find pending signature document
2. Click **Resend Request**
3. Confirm resend
4. New email sent to signer

---

## QuickBooks & Invoicing

**Note**: Requires QuickBooks integration. Contact admin if unavailable.

### Create Invoice from Project

1. Open project
2. Go to **Billing** tab
3. Click **Create Invoice**
4. Invoice form pre-fills with:
   - Customer (from contact)
   - Project name
   - Estimated value
5. Add line items:
   - **Description**: e.g., "Roof replacement materials"
   - **Quantity**: Number of units
   - **Rate**: Price per unit
   - **Amount**: Auto-calculated
6. Add more lines as needed
7. Review total
8. Click **Create Invoice**

Invoice is created in QuickBooks and linked to project.

---

### View Invoice Status

1. Open project
2. Go to **Billing** tab
3. See all invoices:
   - Invoice number
   - Amount
   - Status: Draft, Sent, Paid, Overdue
   - Date created

---

### Send Invoice to Customer

1. Find invoice in Billing tab
2. Click **Send Invoice**
3. Email compose opens with invoice attached
4. Customize email message
5. Click **Send**

Customer receives invoice PDF and payment link (if QB Payments enabled).

---

### Record Payment

1. Open invoice
2. Click **Record Payment**
3. Enter payment details:
   - **Amount**: Payment received
   - **Date**: When received
   - **Method**: Check, Cash, Credit Card
   - **Reference**: Check number, etc.
4. Click **Save Payment**

Payment syncs to QuickBooks.

---

## Tips & Best Practices

### Contact Management

✅ **Do**:
- Add notes after every interaction
- Update contact info when it changes
- Use categories to organize contacts
- Set reminders for follow-ups

❌ **Don't**:
- Create duplicate contacts (search first!)
- Leave important fields blank
- Forget to log activities

---

### Pipeline Management

✅ **Do**:
- Move projects through stages promptly
- Keep estimated values updated
- Set realistic close dates
- Add notes when changing stages

❌ **Don't**:
- Let projects stagnate in one stage
- Skip stages (follow your sales process)
- Neglect old leads

---

### Communication

✅ **Do**:
- Use templates for consistency
- Personalize templated messages
- Log all communications
- Respond to leads within 24 hours

❌ **Don't**:
- Send generic mass emails
- Forget to follow up
- Use SMS for long messages (use email)

---

### Documents

✅ **Do**:
- Use descriptive file names
- Organize with folders
- Keep files under 10MB
- Delete outdated documents

❌ **Don't**:
- Upload sensitive financial info
- Share documents without permission
- Lose track of signed contracts

---

### E-Signatures

✅ **Do**:
- Set reasonable expiration dates
- Include a custom message
- Follow up if not signed in 3 days
- Download signed documents

❌ **Don't**:
- Rush the signer
- Place signature fields incorrectly
- Forget to thank them after signing

---

### QuickBooks

✅ **Do**:
- Create invoices promptly
- Use clear line item descriptions
- Send invoices via email for tracking
- Record payments immediately

❌ **Don't**:
- Modify invoices in QB directly (use platform)
- Create duplicate invoices
- Forget to follow up on overdue invoices

---

## Keyboard Shortcuts

Speed up your workflow with shortcuts:

| Shortcut | Action |
|----------|--------|
| `Ctrl+K` (Mac: `⌘K`) | Global search |
| `Ctrl+N` (Mac: `⌘N`) | New contact |
| `Ctrl+Shift+N` | New project |
| `Ctrl+E` (Mac: `⌘E`) | Compose email |
| `Ctrl+/` (Mac: `⌘/`) | Show keyboard shortcuts |
| `Esc` | Close modal/dialog |

---

## Mobile Access (PWA)

The platform works on mobile as a Progressive Web App.

### Install on iPhone

1. Open Safari
2. Go to platform URL
3. Tap **Share** icon
4. Tap **Add to Home Screen**
5. Name the app
6. Tap **Add**

### Install on Android

1. Open Chrome
2. Go to platform URL
3. Tap menu (3 dots)
4. Tap **Install app**
5. Confirm install

---

## Troubleshooting

### Can't Send Email

**Solutions**:
- Check contact has valid email address
- Verify email integration is configured
- Check spam folder for delivery issues
- Contact admin if persistent

### Can't Send SMS

**Solutions**:
- Verify contact has phone number in correct format
- Check Twilio integration status
- Ensure phone number is not on Do Not Call list
- Contact admin for Twilio credit balance

### QuickBooks Not Working

**Solutions**:
- Verify QuickBooks integration is connected
- Disconnect and reconnect QuickBooks
- Contact admin for permission issues

---

## Get Support

- **Help Center**: Click **?** icon in app
- **Email**: support@roofing-saas.com
- **Phone**: 1-800-ROOFING
- **Hours**: Mon-Fri 8am-6pm CST

---

**End of Sales Rep Guide**

For other guides, see:
- [Administrator Guide](./ADMINISTRATOR_GUIDE.md)
- [Canvasser Guide](./CANVASSER_GUIDE.md)
- [Office Staff Guide](./OFFICE_STAFF_GUIDE.md)

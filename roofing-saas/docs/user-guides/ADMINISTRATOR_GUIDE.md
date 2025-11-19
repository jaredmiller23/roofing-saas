# Administrator Guide

**Tennessee Roofing SaaS Platform**
**Role**: System Administrator
**Last Updated**: November 18, 2025

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Tenant Setup & Configuration](#tenant-setup--configuration)
3. [User Management](#user-management)
4. [Integration Setup](#integration-setup)
5. [Settings & Customization](#settings--customization)
6. [Security & Permissions](#security--permissions)
7. [Billing & Subscription](#billing--subscription)
8. [Troubleshooting](#troubleshooting)

---

## Getting Started

### Your Role

As an Administrator, you have full access to:
- ✅ Tenant configuration and settings
- ✅ User management and role assignment
- ✅ Integration setup (QuickBooks, Twilio, Resend)
- ✅ Billing and subscription management
- ✅ System-wide settings and customization
- ✅ All CRM features (contacts, projects, pipeline)

### First Login

1. **Access the Platform**
   - URL: `https://your-domain.vercel.app`
   - Login with your admin credentials

2. **Complete Your Profile**
   - Navigate to **Settings > Profile**
   - Add your full name, phone, and job title
   - Upload a profile photo (optional)

3. **Review Dashboard**
   - Familiarize yourself with the main navigation
   - Check that your tenant is properly configured

---

## Tenant Setup & Configuration

### Tenant Information

Your tenant is the top-level organization account. All users, contacts, and data belong to your tenant.

#### View Tenant Details

1. Go to **Settings > Organization**
2. Review tenant information:
   - Tenant ID (unique identifier)
   - Organization name
   - Created date
   - Subscription status

#### Update Organization Profile

1. Navigate to **Settings > Organization**
2. Update fields:
   - **Organization Name**: Your company name
   - **Address**: Physical business address
   - **Phone**: Main business phone
   - **Email**: Primary contact email
   - **Website**: Company website URL
3. Click **Save Changes**

---

## User Management

### User Roles

The platform supports four roles:

| Role | Permissions | Use Case |
|------|------------|----------|
| **Administrator** | Full system access | Owner, IT Admin |
| **Manager** | Manage team, view reports | Sales Manager |
| **Sales Rep** | CRM, pipeline, communication | Sales team |
| **Canvasser** | Mobile app, knock logging | Field reps |

### Invite New Users

1. Navigate to **Settings > Team**
2. Click **+ Invite User**
3. Fill in user details:
   - **Email**: User's email address
   - **Role**: Select from dropdown
   - **Name**: Full name (optional)
4. Click **Send Invitation**
5. User will receive email with setup link

**Note**: Invitations expire after 7 days. Resend if needed.

### Manage Existing Users

#### View All Users

1. Go to **Settings > Team**
2. See list of all users with:
   - Name and email
   - Role
   - Status (Active, Pending, Inactive)
   - Last login

#### Edit User Role

1. Navigate to **Settings > Team**
2. Find the user in the list
3. Click **Edit** (pencil icon)
4. Change role in dropdown
5. Click **Save**

#### Deactivate User

1. Go to **Settings > Team**
2. Find the user
3. Click **Deactivate**
4. Confirm deactivation

**Note**: Deactivated users cannot log in but their data is preserved.

#### Reactivate User

1. Go to **Settings > Team**
2. Filter by **Inactive**
3. Find the user
4. Click **Reactivate**

---

## Integration Setup

### QuickBooks Integration

Connect to QuickBooks for invoicing and financial tracking.

#### Setup Steps

1. **Prerequisites**
   - Active QuickBooks Online account
   - Admin access to QuickBooks

2. **Connect QuickBooks**
   - Navigate to **Settings > Integrations**
   - Find **QuickBooks** card
   - Click **Connect**
   - Sign in to QuickBooks
   - Grant permissions
   - Click **Authorize**

3. **Verify Connection**
   - Status should show "Connected"
   - Last sync time displayed
   - Test by viewing QuickBooks customers

4. **Configure Sync Settings**
   - **Auto-sync**: Enable/disable automatic synchronization
   - **Sync Frequency**: Every hour, daily, manual
   - **Sync Contacts**: Map CRM contacts to QB customers
   - **Sync Invoices**: Create invoices from projects

#### Disconnect QuickBooks

1. Go to **Settings > Integrations**
2. Find QuickBooks
3. Click **Disconnect**
4. Confirm disconnection

**Note**: Disconnecting does not delete historical sync data.

---

### Twilio Integration (SMS & Calls)

Connect Twilio for SMS messaging and call logging.

#### Prerequisites

- Active Twilio account
- Twilio Account SID
- Twilio Auth Token
- Twilio Phone Number (purchased)

#### Setup Steps

1. **Get Twilio Credentials**
   - Log in to [Twilio Console](https://console.twilio.com)
   - Copy **Account SID**
   - Copy **Auth Token**
   - Copy **Phone Number** (format: +15551234567)

2. **Configure in Platform**
   - Navigate to **Settings > Integrations**
   - Find **Twilio** card
   - Click **Configure**
   - Paste credentials:
     - Account SID
     - Auth Token
     - Phone Number
   - Click **Save**

3. **Test Connection**
   - Click **Send Test SMS**
   - Enter your phone number
   - You should receive a test message

4. **Enable Call Recording** (Optional)
   - Check **Record all calls**
   - Set recording storage location
   - Recordings appear in Call Logs

#### Pricing Note

Twilio charges per SMS and per minute of calls. Monitor usage in Twilio Console.

---

### Resend Integration (Email)

Connect Resend for automated email campaigns and notifications.

#### Prerequisites

- Resend account
- API Key
- Verified domain (recommended)

#### Setup Steps

1. **Get Resend API Key**
   - Log in to [Resend Dashboard](https://resend.com/api-keys)
   - Click **Create API Key**
   - Copy the key (shown once)

2. **Configure in Platform**
   - Navigate to **Settings > Integrations**
   - Find **Resend** card
   - Click **Configure**
   - Paste **API Key**
   - Enter **From Email** (e.g., noreply@yourcompany.com)
   - Click **Save**

3. **Verify Domain** (Recommended)
   - In Resend Dashboard, go to **Domains**
   - Click **Add Domain**
   - Enter your domain (e.g., yourcompany.com)
   - Add DNS records provided by Resend
   - Verify

4. **Test Email**
   - Click **Send Test Email**
   - Enter your email
   - Check inbox for test message

---

## Settings & Customization

### Pipeline Stages

Customize sales pipeline stages to match your workflow.

#### View Pipeline Stages

1. Navigate to **Settings > Pipeline**
2. See current stages (default: Lead, Proposal, Contract, Installation, Complete)

#### Add New Stage

1. Go to **Settings > Pipeline**
2. Click **+ Add Stage**
3. Enter stage details:
   - **Name**: Stage name
   - **Description**: What this stage represents
   - **Color**: Visual indicator
   - **Order**: Position in pipeline (1-10)
4. Click **Save**

#### Edit Stage

1. Find the stage
2. Click **Edit**
3. Update fields
4. Click **Save**

#### Delete Stage

1. Find the stage
2. Click **Delete**
3. Confirm deletion

**Warning**: Deleting a stage will move all projects in that stage to "Lead".

---

### Email Templates

Create reusable email templates for common communications.

#### Create Template

1. Navigate to **Settings > Email Templates**
2. Click **+ Create Template**
3. Fill in template:
   - **Name**: Template identifier
   - **Subject**: Email subject line
   - **Body**: Email content (supports variables)
4. Use variables:
   - `{{contact_name}}`: Contact's full name
   - `{{company_name}}`: Your company name
   - `{{project_name}}`: Project name
   - `{{user_name}}`: Sender's name
5. Click **Save Template**

#### Example Template

```
Name: Initial Contact
Subject: Thanks for your interest in {{company_name}}

Hi {{contact_name}},

Thank you for reaching out about your roofing project! We'd love to help you with {{project_name}}.

I'll be reaching out shortly to discuss next steps.

Best regards,
{{user_name}}
{{company_name}}
```

---

### SMS Templates

Create SMS templates for quick messaging.

#### Create Template

1. Go to **Settings > SMS Templates**
2. Click **+ Create Template**
3. Fill in:
   - **Name**: Template identifier
   - **Message**: SMS content (max 160 chars)
4. Use variables (same as email)
5. Click **Save**

**Tip**: Keep SMS templates under 160 characters to avoid multi-part messages.

---

### Notification Preferences

Control system-wide notification settings.

#### Configure Notifications

1. Navigate to **Settings > Notifications**
2. Configure for each event type:
   - **New Contact Created**: Email, SMS, or Both
   - **Project Stage Changed**: Email notification
   - **Document Uploaded**: Email notification
   - **Signature Requested**: Email + SMS
   - **Invoice Created**: Email notification

---

## Security & Permissions

### Two-Factor Authentication (2FA)

Enable 2FA for enhanced security.

#### Enable for Your Account

1. Go to **Settings > Security**
2. Click **Enable Two-Factor Authentication**
3. Scan QR code with authenticator app:
   - Google Authenticator
   - Authy
   - Microsoft Authenticator
4. Enter 6-digit code to verify
5. Save recovery codes (important!)

#### Require 2FA for All Users

1. Navigate to **Settings > Security**
2. Check **Require 2FA for all users**
3. Set grace period (7, 14, or 30 days)
4. Click **Save**

Users will be prompted to enable 2FA on next login.

---

### Password Policies

Set password requirements for all users.

#### Configure Password Policy

1. Go to **Settings > Security**
2. Configure requirements:
   - **Minimum Length**: 8-16 characters
   - **Require Uppercase**: Yes/No
   - **Require Numbers**: Yes/No
   - **Require Special Characters**: Yes/No
   - **Password Expiry**: Never, 30, 60, 90 days
3. Click **Save**

**Recommended Settings**:
- Minimum 12 characters
- Require uppercase, numbers, and special characters
- Expiry: 90 days

---

### Row-Level Security (RLS)

The platform uses Row-Level Security to ensure data isolation between tenants.

#### What RLS Means

- ✅ Each tenant's data is completely isolated
- ✅ Users can only access data for their tenant
- ✅ No cross-tenant data leakage
- ✅ Enforced at database level

**No configuration needed** - RLS is automatically enforced.

---

## Billing & Subscription

### View Subscription Details

1. Navigate to **Settings > Billing**
2. View current plan:
   - Plan name (Starter, Professional, Enterprise)
   - Monthly cost
   - Billing cycle
   - Next billing date
   - Payment method

### Update Payment Method

1. Go to **Settings > Billing**
2. Click **Update Payment Method**
3. Enter new card details
4. Click **Save**

### Upgrade/Downgrade Plan

1. Navigate to **Settings > Billing**
2. Click **Change Plan**
3. Select new plan
4. Review pricing
5. Confirm change

**Note**: Changes take effect immediately. Prorated charges apply.

### View Usage & Invoices

1. Go to **Settings > Billing**
2. Click **Usage & Invoices**
3. View:
   - Current period usage (SMS, emails, storage)
   - Historical invoices (PDF download)
   - Payment history

### Cancel Subscription

1. Navigate to **Settings > Billing**
2. Click **Cancel Subscription**
3. Provide feedback (optional)
4. Confirm cancellation

**Note**: Access continues until end of current billing period.

---

## Troubleshooting

### Common Issues

#### Users Can't Log In

**Symptoms**: Users receive "Invalid credentials" error

**Solutions**:
1. Verify user has accepted invitation email
2. Check user status (must be "Active")
3. Reset password via **Forgot Password** link
4. Verify email address is correct

---

#### QuickBooks Not Syncing

**Symptoms**: Customers not appearing, sync errors

**Solutions**:
1. Check QuickBooks connection status
2. Disconnect and reconnect QuickBooks
3. Verify QuickBooks permissions
4. Check for QuickBooks API rate limits

---

#### SMS Messages Not Sending

**Symptoms**: SMS fails with error

**Solutions**:
1. Verify Twilio credentials are correct
2. Check Twilio account balance
3. Verify phone number format (+1XXXXXXXXXX)
4. Check Twilio Console for errors
5. Ensure phone number is not on DNC list

---

#### Email Delivery Issues

**Symptoms**: Emails not received, bouncing

**Solutions**:
1. Check Resend API key is correct
2. Verify domain is verified in Resend
3. Check spam folder
4. Verify recipient email address
5. Review Resend logs for bounce reasons

---

### Get Support

#### Contact Support

- **Email**: support@roofing-saas.com
- **Phone**: 1-800-ROOFING
- **Hours**: Mon-Fri 8am-6pm CST

#### Documentation

- Full documentation: `https://docs.roofing-saas.com`
- Video tutorials: `https://docs.roofing-saas.com/videos`
- API docs: `https://docs.roofing-saas.com/api`

---

## Best Practices

### User Management

- ✅ Review user list monthly
- ✅ Deactivate users who leave the company
- ✅ Use appropriate roles (don't make everyone an admin)
- ✅ Enable 2FA for all users

### Integrations

- ✅ Test integrations after setup
- ✅ Monitor usage to avoid unexpected charges
- ✅ Keep API credentials secure
- ✅ Review integration logs weekly

### Data Management

- ✅ Regular data audits (quarterly)
- ✅ Archive old projects annually
- ✅ Clean up duplicate contacts
- ✅ Export data backups monthly

---

**End of Administrator Guide**

For role-specific guides, see:
- [Sales Rep Guide](./SALES_REP_GUIDE.md)
- [Canvasser Guide](./CANVASSER_GUIDE.md)
- [Office Staff Guide](./OFFICE_STAFF_GUIDE.md)

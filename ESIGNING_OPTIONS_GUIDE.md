# E-Signing Options Analysis for Roofing SaaS

**Created**: September 29, 2025
**Purpose**: Compare e-signature solutions for roofing contracts

---

## 📊 Quick Comparison Table

| Service | Monthly Price | Free Tier | API Quality | Best For |
|---------|--------------|-----------|-------------|----------|
| **SignWell** | $12/mo | 3 docs/mo | Excellent | 🏆 Our Pick |
| **Dropbox Sign** | $15/mo | Limited | Very Good | Simple needs |
| **SignNow** | $8/mo | No | Good | Budget option |
| **PandaDoc** | $19/mo | 14-day trial | Excellent | Full CLM |
| **DocuSign** | $10/mo personal | No | Best | Enterprise |

---

## 🏆 RECOMMENDED: SignWell (formerly Docsketch)

### Why SignWell for Roofing SaaS?
- **Free tier**: 3 documents/month (perfect for testing)
- **Price**: $12/month for unlimited
- **SMS delivery**: Built-in (no extra cost)
- **Simple API**: Easy Next.js integration
- **Templates**: Perfect for standard roofing contracts

### Implementation with Next.js

#### Installation
```bash
npm install @signwell/node-sdk
```

#### Environment Variables
```env
SIGNWELL_API_KEY=your_api_key
SIGNWELL_TEMPLATE_ID=your_contract_template_id
```

#### API Route (/app/api/contracts/send/route.ts)
```typescript
import { SignWellClient } from '@signwell/node-sdk';

const signwell = new SignWellClient({
  apiKey: process.env.SIGNWELL_API_KEY
});

export async function POST(request: Request) {
  const { customerEmail, customerName, projectDetails } = await request.json();

  // Create document from template
  const document = await signwell.documents.createFromTemplate({
    templateId: process.env.SIGNWELL_TEMPLATE_ID,
    name: `Roofing Contract - ${customerName}`,
    recipients: [{
      email: customerEmail,
      name: customerName,
      role: 'Customer'
    }],
    fields: {
      customer_name: customerName,
      project_address: projectDetails.address,
      total_cost: projectDetails.cost,
      completion_date: projectDetails.completionDate
    },
    sendImmediately: true
  });

  // Store in database
  await supabase.from('contracts').insert({
    document_id: document.id,
    customer_id: customerId,
    status: 'sent',
    sent_at: new Date()
  });

  return NextResponse.json({
    success: true,
    documentId: document.id
  });
}
```

#### Webhook Handler for Completion
```typescript
export async function POST(request: Request) {
  const { event, document } = await request.json();

  if (event === 'document_completed') {
    // Update database
    await supabase.from('contracts')
      .update({
        status: 'signed',
        signed_at: new Date(),
        signed_document_url: document.downloadUrl
      })
      .eq('document_id', document.id);

    // Trigger next workflow (create project, send to QuickBooks, etc.)
    await createProjectFromContract(document.id);
  }

  return NextResponse.json({ received: true });
}
```

---

## 💰 Cost Analysis for 100 Contracts/Month

### SignWell
- **Monthly**: $12
- **Per contract**: $0.12
- **SMS delivery**: Included
- **Templates**: Unlimited

### Dropbox Sign
- **Monthly**: $15
- **Per contract**: $0.15
- **SMS delivery**: Extra via Twilio
- **Templates**: Unlimited

### DocuSign
- **Monthly**: $40 (Business plan needed for API)
- **Per contract**: $0.40
- **SMS delivery**: Extra
- **Templates**: Limited by plan

---

## 🎯 Implementation Strategy

### Phase 1: Basic E-Signing (Week 1)
1. Sign up for SignWell free account
2. Create roofing contract template
3. Implement send contract API
4. Set up completion webhook

### Phase 2: Advanced Features (Week 2)
1. Add multiple signers (customer + spouse)
2. Implement SMS reminders
3. Add contract attachments (scope of work)
4. Create revision workflow

### Phase 3: Integration (Week 3)
1. Connect to QuickBooks for invoicing
2. Auto-create projects on signing
3. Generate material orders
4. Schedule initial site visit

---

## 📋 Contract Template Fields

### Required for Roofing
```javascript
const contractFields = {
  // Customer Information
  customer_name: 'John Smith',
  customer_email: 'john@email.com',
  customer_phone: '615-555-0100',
  property_address: '123 Main St, Nashville, TN',

  // Project Details
  roof_type: 'Asphalt Shingle',
  square_footage: '2,500 sq ft',
  pitch: '6/12',
  layers_to_remove: '1',

  // Pricing
  materials_cost: '$8,500',
  labor_cost: '$6,500',
  permit_fees: '$350',
  total_cost: '$15,350',
  deposit_amount: '$3,000',

  // Timeline
  start_date: '10/15/2025',
  completion_date: '10/20/2025',
  weather_contingency: '5 additional days',

  // Warranty
  materials_warranty: '30 years',
  workmanship_warranty: '10 years',

  // Legal
  payment_terms: 'Deposit due on signing, balance on completion',
  cancellation_policy: '72 hours notice required'
};
```

---

## 🔒 Security & Compliance

### Audit Trail Requirements
```typescript
// Track all document events
const auditLog = {
  document_id: 'doc_123',
  events: [
    { type: 'created', timestamp: '2025-09-29T10:00:00Z', user: 'admin' },
    { type: 'sent', timestamp: '2025-09-29T10:01:00Z', to: 'customer@email.com' },
    { type: 'viewed', timestamp: '2025-09-29T14:30:00Z', ip: '192.168.1.1' },
    { type: 'signed', timestamp: '2025-09-29T14:35:00Z', ip: '192.168.1.1' }
  ]
};
```

### Legal Compliance
- **ESIGN Act**: Compliant (federal law)
- **UETA**: Adopted by Tennessee
- **Storage**: 7 years recommended
- **Backups**: Download signed PDFs to Supabase Storage

---

## ⚡ Quick Decision Guide

### Choose SignWell if:
- ✅ Want lowest cost ($12/mo)
- ✅ Need free tier for testing
- ✅ Simple contracts only
- ✅ SMS delivery important

### Choose Dropbox Sign if:
- ✅ Already using Dropbox
- ✅ Need Google Workspace integration
- ✅ Want familiar interface

### Choose PandaDoc if:
- ✅ Need full document creation
- ✅ Want proposal features
- ✅ Need payment collection

### Avoid DocuSign unless:
- ❌ Enterprise requirements
- ❌ Complex workflows
- ❌ Budget not a concern

---

## 🚀 Next Steps

1. **Sign up for SignWell free account**
2. **Create contract template** with roofing fields
3. **Test with 3 free documents**
4. **Implement in Next.js**
5. **Upgrade when ready** ($12/month)

---

## 📞 Support & Resources

- [SignWell API Docs](https://docs.signwell.com/)
- [SignWell Next.js Example](https://github.com/signwell/examples)
- [Contract Templates](https://www.signwell.com/templates)
- Support: support@signwell.com
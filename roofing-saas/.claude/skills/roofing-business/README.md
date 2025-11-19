# Roofing Business Skill

**Domain**: Residential & Commercial Roofing Industry
**Client**: Tennessee Roofing Contractor
**Last Updated**: November 17, 2025

## 🎯 When This Skill Loads

This skill automatically loads when you're:
- Designing customer workflows or pipeline stages
- Building estimate calculators or pricing features
- Creating forms related to inspections, projects, or contracts
- Discussing roofing-specific business logic
- Planning customer journey features

## 📚 Core Knowledge Areas

### 1. Industry Terminology
### 2. Customer Journey & Pipeline
### 3. Estimate Calculations
### 4. Project Workflows
### 5. Common Pain Points (Why they're replacing Proline + Enzy)

## 📖 Contents

See additional files in this skill:
- `terminology.md` - Industry-specific terms and definitions
- `workflows.md` - Common processes and business workflows
- `compliance-basics.md` - Permitting, inspections, and regulatory basics

## 🎯 Key Business Rules

### Estimate Calculation Formula
```
Total Estimate = Material Cost + Labor Cost + Permits + Markup

Material Cost = (Square Footage / 100) × Price per Square
Labor Cost = Crew Size × Hours × Hourly Rate
Typical Markup = 20-30%
```

**Example**:
- 2,000 sq ft roof
- $350 per square
- 3-person crew, 16 hours @ $75/hour
- $500 permits
- 25% markup

```
Material: (2000 / 100) × $350 = $7,000
Labor: 3 × 16 × $75 = $3,600
Permits: $500
Subtotal: $11,100
Markup (25%): $2,775
TOTAL: $13,875
```

### Payment Structure
- **Deposit**: 30% upfront (before work starts)
- **Progress**: Optional 40% at halfway point (for large projects)
- **Final**: 70% (or remaining 30%) on completion

### Project Timeline
- **Inspection to Estimate**: 1-2 days
- **Estimate to Contract**: 3-7 days (depends on customer decision)
- **Contract to Permitting**: 3-5 days
- **Permitting to Start**: 1-2 weeks (municipality dependent)
- **Installation**: 1-3 days (residential), 1-2 weeks (commercial)
- **Final Inspection**: 1-3 days after installation
- **Total Timeline**: 2-4 weeks from contract to completion

## 🎯 Customer Journey Stages

### 1. Lead Generation
**Sources**:
- Storm targeting (hail, wind damage areas)
- Door-to-door canvassing (Enzy app currently)
- Online inquiries
- Referrals
- Insurance adjusters

**Data Needed**: Name, address, phone, email, lead source, damage type

### 2. Initial Contact
**Actions**:
- Call to introduce company
- Schedule inspection appointment
- Confirm contact details
- Set expectations

**Timeline**: Within 24 hours of lead capture

### 3. Inspection
**What Happens**:
- Sales rep visits property
- Photos of damage (roof, gutters, flashing)
- Measurements (square footage, pitch)
- Note special conditions (skylights, chimneys, valleys)
- Check for code violations

**Tools Needed**: Camera, measuring tools, ladder access

**Duration**: 30-45 minutes

### 4. Estimate Preparation
**Calculations**:
- Square footage → material quantity
- Labor hours (based on pitch, complexity)
- Permit costs (municipality lookup)
- Markup application

**Deliverable**: Written estimate with itemized breakdown

**Timeline**: 1-2 days after inspection

### 5. Estimate Presentation
**In-Person** (preferred):
- Review estimate line-by-line
- Answer questions
- Discuss financing options
- Address concerns
- Ask for the sale

**Email** (if customer unavailable):
- Send PDF estimate
- Follow up call within 24 hours

### 6. Contract Signing
**Required**:
- E-signature on contract
- 30% deposit payment
- Insurance claim assignment (if applicable)
- Start date selection

**Our Tool**: E-signature feature (Phase 4 complete)

### 7. Permitting
**Process**:
- Submit plans to municipality
- Pay permit fees
- Wait for approval (1-2 weeks typical)
- Post permit on-site

**Variation**: Tennessee counties have different requirements

### 8. Scheduling
**Logistics**:
- Assign crew (3-4 person team typical)
- Order materials (5-7 day lead time)
- Confirm start date with customer
- Pre-installation call (day before)

### 9. Installation
**Day 1**:
- Crew arrival (7-8am)
- Set up tarps, ladders, dumpster
- Remove old roofing material
- Inspect decking, repair if needed
- Install underlayment

**Day 2** (if multi-day):
- Install shingles
- Install flashing, ridge caps
- Clean up debris
- Final walk-around

**Day 3** (if needed):
- Touch-ups
- Final inspection

### 10. Customer Final Inspection
**Walk-Through**:
- Show completed work
- Address any concerns
- Explain warranty
- Request final payment

### 11. City Inspector Final
**Required**:
- Schedule city inspector
- Receive approval
- Close permit

### 12. Final Payment & Closeout
**Actions**:
- Collect final 70% payment
- Provide invoice (QuickBooks)
- Warranty registration
- Request review/referral

## 🎨 Pipeline Stages (for CRM)

Based on the customer journey, here are the recommended pipeline stages:

1. **New Lead** - Just captured, not contacted yet
2. **Contacted** - Initial call made, inspection scheduled
3. **Inspected** - Inspection complete, preparing estimate
4. **Estimate Sent** - Estimate delivered, awaiting response
5. **Negotiating** - Customer interested, discussing details
6. **Contract Sent** - Contract delivered, awaiting signature
7. **Contracted** - Signed contract, deposit received
8. **Permitting** - Awaiting permit approval
9. **Scheduled** - Crew assigned, materials ordered
10. **In Progress** - Installation underway
11. **Completed** - Work done, awaiting final payment
12. **Closed Won** - Final payment received, project complete
13. **Closed Lost** - Customer declined (track reason)

## 🚧 Common Pain Points

### Why Replacing Proline CRM
- Too many clicks to update a lead
- Mobile interface is clunky
- Slow to load in the field
- Can't easily see territory coverage
- No offline mode

### Why Replacing Enzy App
- Separate from CRM (double data entry)
- Photo management is poor
- Can't see which streets were knocked
- No team coordination features
- Crashes on iOS sometimes

### What They Want in Our App
- **Fast**: Minimal clicks, instant updates
- **Mobile-First**: 80% of usage is in field on iPhone/iPad
- **Unified**: One tool for everything (no Proline + Enzy split)
- **Offline**: Works without cell signal (rural areas)
- **Visual**: Map-based territory management
- **Photos**: Easy capture, storage, and sharing

## 🎯 Unique Aspects of This Business

### Storm Targeting
- After hail/wind storms, they target affected areas
- Use weather data + insurance claims to find prospects
- Door-to-door is most effective (Enzy app territory tracking)
- Goal: Be first to contact homeowner after storm

### Insurance Claims
- ~60% of projects involve insurance claims
- Work directly with adjusters
- Need to document damage thoroughly (photos critical)
- Payment often comes from insurance company

### Seasonal Variation
- **Peak**: March-October (good weather)
- **Slow**: November-February (rain, cold, ice)
- Sales reps focus on lead gen in winter, installations in summer

### Tennessee Market Specifics
- One-party consent state (call recording legal without notice)
- Moderate permit requirements (not as strict as CA, stricter than GA)
- Average home price: $300K-$400K
- Typical roof replacement: $8,000-$15,000
- Main competitors: 5-10 other local roofing companies

## 🔧 Technical Implications

### For Estimate Calculator
- Must support square-based pricing
- Need pitch adjustment (steeper = more labor)
- Permit lookup by county/city
- Save estimates to customer record
- PDF generation for email

### For Territory Management
- Map view with pins for each address
- Color-coding by status (knocked, interested, not home)
- Offline mode (IndexedDB storage)
- Photo capture and geo-tagging
- Team coordination (who's working which area)

### For Project Pipeline
- Drag-and-drop between stages
- Time tracking in each stage (report on bottlenecks)
- Document storage (estimates, contracts, permits, photos)
- Calendar view for scheduled installations
- QuickBooks sync for invoicing

### For Communication
- SMS campaigns for storm targeting (TCPA compliance critical)
- Call tracking with optional recording
- Email automation for follow-ups
- Template messages for common scenarios

## 💡 Using This Skill

When Claude loads this skill, expect:
- Correct roofing terminology in features
- Pipeline stages that match real workflow
- Estimate calculations using industry formulas
- Understanding of insurance claim workflows
- Mobile-first, field-optimized suggestions
- Awareness of Proline + Enzy pain points

## 🔄 Updates

Add to this skill as you learn more about:
- Specific customer preferences
- New workflows they want to support
- Pain points discovered during development
- Industry terms you encounter

---

**Remember**: This is a Tennessee roofing contractor with 10-15 sales reps replacing Proline + Enzy with a single unified mobile-first tool.

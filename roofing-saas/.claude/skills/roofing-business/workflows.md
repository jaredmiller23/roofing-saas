# Common Roofing Business Workflows

**Purpose**: Standard processes in roofing business operations
**For**: Designing features that match real-world workflows
**Last Updated**: November 17, 2025

## 🎯 Core Workflows

### 1. Storm Targeting Workflow
```
1. Storm hits area (weather data)
2. Identify affected zip codes
3. Pull address lists for door-knocking
4. Assign territories to sales reps
5. Reps canvas area (Enzy → our new app)
6. Mark each address (knocked, interested, not home, callback)
7. Follow up on interested leads within 24 hours
8. Schedule inspections
```

**App Features Needed**:
- Storm data integration
- Territory assignment & mapping
- Mobile knock logging
- Lead status tracking
- Auto-follow-up reminders

### 2. Inspection to Estimate Workflow
```
1. Sales rep arrives at property
2. Take photos (roof, damage, property)
3. Measure square footage (laser or tape)
4. Note pitch, complexity (skylights, chimneys)
5. Check for code issues
6. Input data into app
7. App calculates estimate automatically
8. Review with customer on-site (if possible)
9. Email estimate PDF if customer busy
```

**App Features Needed**:
- Photo capture with geo-tagging
- Measurement input (sqft, pitch)
- Auto-estimate calculation
- PDF generation
- Email sending

### 3. Contract to Installation Workflow
```
1. Customer agrees to estimate
2. Send contract via e-signature
3. Collect 30% deposit (Stripe/QuickBooks)
4. Submit permit application
5. Wait for permit approval (1-2 weeks)
6. Order materials (5-7 days lead time)
7. Assign crew
8. Schedule installation date
9. Send pre-installation reminder (day before)
10. Crew performs installation
11. Customer walk-through
12. Address punch list items
13. Schedule city inspector
14. City inspector approves
15. Collect final 70% payment
16. Close project in app
```

**App Features Needed**:
- E-signature integration
- Payment processing
- Permit tracking
- Material order tracking
- Crew scheduling
- Customer notifications
- Punch list management
- Invoice generation (QB sync)

### 4. Daily Sales Rep Workflow
```
Morning:
- Review assigned territory on map
- Load addresses to knock today
- Drive to territory

Field Work:
- Knock door
- If no answer: Mark "not home", leave flyer
- If interested: Quick inspection, take photos, schedule follow-up
- If not interested: Mark "declined"
- Move to next address

Evening:
- Upload day's photos
- Update lead statuses
- Set follow-up tasks for tomorrow
- Sync data to CRM
```

**App Features Needed**:
- Offline mode (no signal in rural areas)
- Territory map view
- Quick lead capture form
- Photo upload (bulk)
- Status updates
- Task management
- Data sync

### 5. Team Manager Workflow
```
Daily:
- Review team performance (knock count, inspection count)
- Check pipeline movement
- Assign new territories
- Review estimates pending approval

Weekly:
- Team meeting
- Review win/loss reasons
- Adjust territories based on performance
- Plan storm targeting based on weather

Monthly:
- Commission calculation
- Performance reviews
- Pipeline analysis (bottlenecks)
```

**App Features Needed**:
- Team dashboard
- Performance metrics
- Territory management
- Pipeline reports
- Commission calculator
- Analytics

## 🔄 Quick Reference Workflows

### Lead Capture (Door-Knocking)
```
1. Knock door
2. If answer: Brief intro → Offer free inspection
3. If interested: Get contact info
4. Take quick exterior photos
5. Schedule inspection appointment
6. Mark address as "knocked"
7. Move to next house
```
**Duration**: 3-5 minutes per house

### Mobile Inspection
```
1. Arrive at property
2. Introduce self, confirm appointment
3. Walk property perimeter (take photos)
4. Climb to roof (if safe access)
5. Take close-up photos of damage
6. Measure roof dimensions
7. Note special features (chimneys, valleys, skylights)
8. Discuss findings with homeowner
9. Input measurements in app
10. App generates estimate
11. Review estimate (verbally)
12. Email detailed estimate
```
**Duration**: 30-45 minutes

### E-Signature Contract
```
1. Customer verbally agrees to price
2. In app: Tap "Send Contract"
3. App generates contract PDF
4. Send via DocuSign-style flow
5. Customer signs on phone/tablet/computer
6. App notifies rep of signature
7. Process 30% deposit
8. Move to "Contracted" pipeline stage
```
**Duration**: 5-10 minutes (if customer ready)

### Permit Submission
```
1. Gather required docs (contract, site plan, roof plan)
2. Complete municipality application
3. Pay permit fee
4. Submit online or in-person (varies by county)
5. Track status in app
6. Receive approval notification
7. Print permit, post on-site
```
**Duration**: 30 min to submit, 1-2 weeks to approve

### Installation Day
```
Day 1:
- 7am: Crew arrives, sets up
- 7:30am: Begin tear-off
- 10am: Tear-off complete, inspect decking
- 11am: Repair any damaged decking
- 12pm: Lunch
- 1pm: Install underlayment
- 3pm: Begin shingle installation
- 5pm: Cover exposed areas, clean up
- 6pm: Depart

Day 2 (if needed):
- 7am: Arrive, resume shingles
- 12pm: Lunch
- 2pm: Install flashing, ridge caps
- 4pm: Final inspection, clean up
- 5pm: Customer walk-through
- 5:30pm: Depart
```

### Final Payment Collection
```
1. Installation complete
2. Customer walk-through
3. Address punch list (if any)
4. Customer satisfied
5. In app: Generate final invoice
6. Sync to QuickBooks
7. Send invoice via email
8. Collect payment (check, card, ACH)
9. Update app: "Payment received"
10. Move to "Closed Won"
11. Send thank you + review request
```

---

**Using These Workflows**: When designing features, refer to these workflows to ensure the app supports real-world processes, not theoretical ones.

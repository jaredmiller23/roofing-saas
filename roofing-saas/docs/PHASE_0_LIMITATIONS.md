# Phase 0 Production Sign-Off - Known Limitations

**Last Updated**: 2026-02-01
**Customer**: Appalachian Storm Restoration (Tennessee)

---

## What's Working

### TCPA Compliance
- **Opt-out blocking** - Contacts who opt out are blocked from further calls
- **DNC registry blocking** - Numbers on federal/state/internal DNC lists are blocked
- **Time restrictions** - Calls blocked outside 9am-8pm recipient local time
- **Consent capture** - Full PEWC proof captured (IP, timestamp, legal text) when checkbox is checked
- **DNC sync monitoring** - Daily alerts if FTC 31-day sync deadline approaches/passes
- **Opt-out deadline monitoring** - Daily alerts if TCPA 10-business-day deadline approaches/passes

### Recording (One-Party States)
- Tennessee is a one-party consent state
- Recording works with announcement only (no verbal consent required)
- Recording announcement infrastructure exists and is ready

---

## Known Gaps (Phase 1)

### Two-Party State Recording
**Affected states**: CA, CT, FL, IL, MD, MA, MI, MT, NH, PA, WA

For calls to these states:
- Recording requires verbal consent (not just announcement)
- IVR consent capture is not yet implemented
- **Current behavior**: Calls can be made, but recording should be disabled for these states

**Workaround**: Manually verify recipient state before enabling recording.

### E-Signature Document Hash
- Signed documents do not have cryptographic hash verification
- Cannot cryptographically prove document wasn't modified after signing
- **Recommendation**: Use e-signatures only for standard contracts, not high-stakes disputes

### GDPR/CCPA Deletion API
- No automated hard delete for "right to be forgotten" requests
- **Recommendation**: US customers only initially; manual deletion for EU/CA requests

### DNC Registry Sync
- Monitoring alerts when sync is due/overdue
- Actual sync with FTC registry is manual via API
- **Requirement**: Sync every 31 days to avoid $43k+ FTC penalties

---

## Verification Checklist

### Before Go-Live
- [ ] Login works with all user accounts
- [ ] Contacts can be created with consent checkbox
- [ ] Calls to contacts with consent succeed
- [ ] Calls to contacts without consent are blocked
- [ ] Calls to DNC numbers are blocked
- [ ] Calls outside hours are blocked

### After Go-Live
- [ ] Monitor Vercel logs for daily-tasks cron (8 AM UTC)
- [ ] Verify 6 tasks complete: signatures, campaigns, billing, storm, dnc-sync, opt-out
- [ ] Check for compliance alerts in admin dashboard

---

## Contact

For questions about compliance gaps or Phase 1 timeline, contact Clarity AI Development.

# Sidebar Navigation Specification

**Source**: Owner (Fahredin) via conversation
**Date**: 2025-12-17
**Status**: AUTHORITATIVE - This is the source of truth for sidebar structure

## Owner's Exact Specification

```
SELL:
- Knock (renamed from Field Activity)
- Signatures
- Claims
- Incentives
- Lead Gen
- Storm Intel

CORE:
- Dashboard
- Pipeline
- Business Intel
- Events
- Tasks

COMMUNICATIONS:
- Call Log
- Messages
- Emails
- Contacts

SETTINGS:
- Settings
```

## Implementation Notes

- "Knock" links to `/knocks` (formerly territories)
- "Signatures" links to `/signatures`
- "Claims" links to `/claims`
- "Incentives" links to `/incentives`
- "Lead Gen" links to `/storm-targeting`
- "Storm Intel" links to `/storm-tracking`
- "Pipeline" links to `/projects`
- "Business Intel" links to `/insights`
- "Events" links to `/events`
- "Tasks" links to `/tasks`
- "Call Log" links to `/call-logs`
- "Messages" links to `/messages`
- "Emails" links to `/campaigns`
- "Contacts" links to `/contacts`

## Change History

| Date | Change | Commit |
|------|--------|--------|
| 2025-12-17 | Initial spec captured | b019c47 |
| 2025-12-17 | Fixed implementation to match spec | b019c47 |

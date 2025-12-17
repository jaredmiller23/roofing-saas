# Adaptive UI System

**Status**: Phases 1-4.1 Complete
**Last Updated**: 2025-12-17

## Overview

The Adaptive UI System transforms the application from one-size-fits-all responsive design to device-aware adaptive UI. Different users see different interfaces based on their device, role, and context.

## Three UI Modes

| Mode | Target User | Screen Size | Key Features |
|------|-------------|-------------|--------------|
| **Field** | Door knockers, field techs | Mobile (<768px) | 4-button home, bottom nav, large touch targets |
| **Manager** | Project managers, team leads | Tablet (768-1024px) | Collapsible sidebar, focused nav |
| **Full** | Admins, office staff | Desktop (>1024px) | Full sidebar, all features |

## Architecture

```
lib/ui-mode/
├── types.ts          # UIMode type, config interfaces
├── context.tsx       # UIModeProvider, useUIModeContext hook
└── detection.ts      # Device detection, context signals

hooks/
└── useUIMode.ts      # Convenience hook for accessing/setting mode

components/layout/
├── AdaptiveLayout.tsx    # Mode switcher - renders appropriate layout
├── FieldWorkerHome.tsx   # Field mode home screen
├── FieldWorkerNav.tsx    # Field mode bottom navigation
└── ManagerLayout.tsx     # Manager mode with collapsible sidebar
```

## Detection Logic

The system uses multiple signals for accurate detection:

1. **Screen size** (primary)
2. **Touch capability** (CSS media queries)
3. **User agent** (mobile/tablet patterns)
4. **User preference** (stored in localStorage)

```typescript
// Detection hierarchy
if (userPreference) return userPreference  // Manual override wins
if (screenWidth < 768) return 'field'
if (screenWidth < 1024 || isTablet) return 'manager'
return 'full'
```

## Context-Aware Signals (P4.1)

Enhanced detection for adaptive features:

```typescript
interface ContextSignals {
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night'
  currentHour: number
  location: LocationContext
  isInMotion: boolean
  connectionType: 'wifi' | 'cellular' | 'offline' | 'unknown'
}
```

### Functions

| Function | Purpose |
|----------|---------|
| `detectTimeOfDay()` | Returns time category (5am-12pm = morning, etc.) |
| `detectConnectionType()` | Network status for offline-aware features |
| `checkLocationPermission()` | Checks without triggering prompt |
| `getCurrentLocation()` | Battery-conscious location polling |
| `getContextualUIHints()` | Returns UI suggestions based on context |

### UI Hints Based on Context

```typescript
{
  showTomorrowsSchedule: true,  // In evening/night
  suggestFieldMode: true,       // On cellular or at job site
  showOfflineIndicator: true,   // When offline
  prioritizeQuickActions: true  // Morning or on cellular
}
```

## User Settings

Users can override automatic detection in Settings > Appearance:

- **Auto** (default): System detects best mode
- **Field Mode**: Force simplified UI
- **Manager Mode**: Force tablet-optimized UI
- **Full Mode**: Force desktop UI

Preferences are stored in localStorage: `ui-mode-preference`

## Commits

| Phase | Commit | Description |
|-------|--------|-------------|
| P1 | 9fdf38b | Foundation - types, context, detection, settings |
| P2 | 7323ce4 | Field Worker UI - home, nav, quick actions |
| P2.5 | b97fd21 | Polish - animations, touch feedback, accessibility |
| P3.1 | 25ec19d | Manager layout - collapsible sidebar |
| P4.1 | 8e3b25f | Context-aware detection foundation |

## Bug Fixes (Related)

| Commit | Fix |
|--------|-----|
| 5f71030 | Sidebar nav: Added Contacts, Emails |
| 5acbb59 | Weekly Challenge widget API mapping |
| f181b1c | Calendar event colors using theme variables |

## Remaining Work

**P4.2: Smart Suggestions** (Future)
- Nearby callback notifications
- Usage pattern recognition
- Location-aware contact suggestions
- Time-based productivity insights

## Files Modified

### Core System
- `lib/ui-mode/types.ts`
- `lib/ui-mode/context.tsx`
- `lib/ui-mode/detection.ts`
- `hooks/useUIMode.ts`

### Layout Components
- `components/layout/AdaptiveLayout.tsx`
- `components/layout/FieldWorkerHome.tsx`
- `components/layout/FieldWorkerNav.tsx`
- `components/layout/ManagerLayout.tsx`

### Integration Points
- `app/[locale]/(dashboard)/layout.tsx` - UIModeProvider wrapped
- `app/[locale]/(dashboard)/settings/appearance/page.tsx` - Mode selector
- `components/layout/Sidebar.tsx` - Updated navigation

/**
 * ARIA Platform Knowledge: UI Components
 * Static knowledge about the app's UI layout, positioning, and z-index layers.
 * Gives ARIA self-awareness about her own interface elements and other persistent UI components.
 */

export interface UIComponentDefinition {
  /** Machine identifier */
  name: string
  /** Human-readable label */
  label: string
  /** Visual description of the element */
  appearance: string
  /** CSS positioning details */
  positioning: {
    type: 'fixed' | 'absolute' | 'relative' | 'static'
    location: string
    zIndex: number
    cssClasses: string
  }
  /** Possible states this component can be in */
  states: UIComponentState[]
  /** Names of components that may visually conflict */
  potentialConflicts: string[]
  /** Tips for diagnosing issues */
  troubleshooting: string[]
}

export interface UIComponentState {
  name: string
  description: string
  trigger: string
}

// ---------------------------------------------------------------------------
// ARIA's own UI components (self-model)
// ---------------------------------------------------------------------------

export const ARIA_COMPONENTS: UIComponentDefinition[] = [
  {
    name: 'aria_chat_button',
    label: 'ARIA Chat Button',
    appearance: 'Coral/orange circular button with a message bubble icon in the bottom-right corner of the screen',
    positioning: {
      type: 'fixed',
      location: 'Bottom-right corner, 24px from bottom and right edges',
      zIndex: 40,
      cssClasses: 'fixed bottom-6 right-6 z-40 rounded-full bg-primary',
    },
    states: [
      { name: 'visible', description: 'Shown when chat panel is closed', trigger: 'Default state' },
      { name: 'hidden', description: 'Hidden when chat panel is open', trigger: 'Opening the chat panel' },
    ],
    potentialConflicts: ['sync_status', 'install_prompt', 'field_worker_nav'],
    troubleshooting: [
      'This button should only appear when the ARIA chat panel is closed',
      'If a second circle appears behind or near this button, another floating element may be at a similar position',
      'The button uses z-index 40 and is positioned at bottom-6 right-6 (24px offset)',
    ],
  },
  {
    name: 'aria_chat_panel',
    label: 'ARIA Chat Panel',
    appearance: 'Slide-over panel from the right side of the screen, full height, 400px wide on desktop, full width on mobile',
    positioning: {
      type: 'fixed',
      location: 'Right edge, full height, slides in from off-screen',
      zIndex: 50,
      cssClasses: 'fixed top-0 right-0 h-full z-50 w-full sm:w-[400px]',
    },
    states: [
      { name: 'open', description: 'Panel visible, slid in from right', trigger: 'Clicking the ARIA chat button' },
      { name: 'closed', description: 'Panel hidden off-screen to the right', trigger: 'Clicking close or the backdrop' },
    ],
    potentialConflicts: ['sidebar', 'global_search'],
    troubleshooting: [
      'The panel should slide in smoothly from the right with a 300ms transition',
      'On mobile, the panel takes up full width',
      'If the panel appears behind other elements, there may be a z-index conflict (panel uses z-50)',
      'The send button is at the bottom of the panel — floating elements near the bottom-right could overlap it',
    ],
  },
]

// ---------------------------------------------------------------------------
// Other persistent layout components
// ---------------------------------------------------------------------------

export const LAYOUT_COMPONENTS: UIComponentDefinition[] = [
  {
    name: 'sidebar',
    label: 'Sidebar Navigation',
    appearance: 'Dark vertical sidebar on the left with navigation links and logo',
    positioning: {
      type: 'fixed',
      location: 'Left edge, full height, 256px wide on desktop',
      zIndex: 30,
      cssClasses: 'fixed left-0 top-0 h-screen w-64',
    },
    states: [
      { name: 'expanded', description: 'Full sidebar visible', trigger: 'Desktop viewport (lg+)' },
      { name: 'collapsed', description: 'Sidebar hidden', trigger: 'Mobile viewport (below lg)' },
      { name: 'mobile_open', description: 'Overlay sidebar on mobile', trigger: 'Tapping hamburger menu' },
    ],
    potentialConflicts: ['aria_chat_panel'],
    troubleshooting: [
      'On desktop, sidebar and ARIA panel coexist (sidebar left, ARIA right)',
      'On small screens, both could overlap — close one before using the other',
    ],
  },
  {
    name: 'global_search',
    label: 'Command Palette / Global Search',
    appearance: 'Centered modal dialog with search input, activated by Cmd/Ctrl+K',
    positioning: {
      type: 'fixed',
      location: 'Centered on screen with a dark backdrop',
      zIndex: 50,
      cssClasses: 'fixed inset-0 z-50',
    },
    states: [
      { name: 'closed', description: 'Not visible', trigger: 'Default state' },
      { name: 'open', description: 'Centered search modal with results', trigger: 'Cmd/Ctrl+K keyboard shortcut' },
    ],
    potentialConflicts: ['aria_chat_panel'],
    troubleshooting: [
      'If search modal appears behind ARIA panel, close the panel first',
    ],
  },
  {
    name: 'sync_status',
    label: 'Sync Status Indicator',
    appearance: 'Small indicator in the bottom-right showing offline/sync state',
    positioning: {
      type: 'fixed',
      location: 'Bottom-right corner, 16px from bottom and right edges',
      zIndex: 40,
      cssClasses: 'fixed bottom-4 right-4 z-40',
    },
    states: [
      { name: 'hidden', description: 'Not visible when online', trigger: 'Normal network state' },
      { name: 'syncing', description: 'Shows sync progress', trigger: 'Coming back online after offline' },
      { name: 'offline', description: 'Shows offline warning', trigger: 'Network disconnection' },
    ],
    potentialConflicts: ['aria_chat_button'],
    troubleshooting: [
      'This indicator is very close to the ARIA chat button (16px vs 24px from corner)',
      'When both are visible, the ARIA button may partially overlap the sync indicator',
      'This is only visible during offline/sync states — normally not shown',
    ],
  },
  {
    name: 'install_prompt',
    label: 'PWA Install Prompt',
    appearance: 'Full-width banner at the bottom of the screen prompting to install the app',
    positioning: {
      type: 'fixed',
      location: 'Bottom edge, full width',
      zIndex: 50,
      cssClasses: 'fixed bottom-0 left-0 right-0 z-50',
    },
    states: [
      { name: 'hidden', description: 'Not shown', trigger: 'Already installed or dismissed' },
      { name: 'visible', description: 'Install banner shown', trigger: 'PWA install criteria met' },
    ],
    potentialConflicts: ['aria_chat_button', 'field_worker_nav'],
    troubleshooting: [
      'If this banner appears, it may push up against the ARIA chat button',
      'Dismissing the banner resolves any overlap',
    ],
  },
]

export const ALL_UI_COMPONENTS = [...ARIA_COMPONENTS, ...LAYOUT_COMPONENTS]

/**
 * Search for UI components matching a text query.
 * Searches across name, label, and appearance fields.
 */
export function findUIComponent(query: string): UIComponentDefinition[] {
  const terms = query.toLowerCase().split(/\s+/)
  return ALL_UI_COMPONENTS.filter(component => {
    const searchable = `${component.name} ${component.label} ${component.appearance}`.toLowerCase()
    return terms.some(term => searchable.includes(term))
  })
}

/**
 * Get ARIA's own UI component definitions (self-model).
 */
export function getARIASelfModel(): UIComponentDefinition[] {
  return ARIA_COMPONENTS
}

/**
 * Check for potential z-index or positioning conflicts between two named components.
 */
export function checkConflicts(componentNameA: string, componentNameB: string): string[] {
  const a = ALL_UI_COMPONENTS.find(c => c.name === componentNameA)
  const b = ALL_UI_COMPONENTS.find(c => c.name === componentNameB)
  if (!a || !b) return []

  const conflicts: string[] = []

  if (a.positioning.zIndex === b.positioning.zIndex) {
    conflicts.push(`${a.label} and ${b.label} share z-index ${a.positioning.zIndex} — they may overlap if positioned nearby`)
  }

  if (a.potentialConflicts.includes(componentNameB)) {
    conflicts.push(`${a.label} lists ${b.label} as a potential visual conflict`)
  }

  if (b.potentialConflicts.includes(componentNameA)) {
    conflicts.push(`${b.label} lists ${a.label} as a potential visual conflict`)
  }

  return conflicts
}

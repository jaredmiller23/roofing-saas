# Theme Standards - Coral Jade Aesthetic

**Applies to**: All UI components, pages, and styling
**Last Updated**: December 12, 2025
**Theme System**: Tailwind CSS v4.1.18 with CSS Custom Properties

## Overview

The Roofing SaaS application uses the **Coral Jade Afternoon** theme - a warm, professional dark theme designed for roofing contractors. The theme is defined using CSS custom properties in `app/globals.css` and mapped to Tailwind utility classes.

**Critical Rule**: NEVER use hardcoded Tailwind color classes. Always use semantic theme variables.

## Coral Jade Color Palette

### Primary Colors
```css
--primary: #FF8243        /* Coral - Brand color, CTAs, primary actions */
--secondary: #2D7A7A      /* Teal - Secondary actions, calm elements */
```

### Accent Colors
```css
--terracotta: #C9705A     /* Warm accents, highlights */
--cyan: #7DD3D3           /* Success states, info */
--brown: #4A3428          /* Grounded elements */
--slate: #3A4045          /* Neutral anchors */
```

### Semantic Colors
```css
--background: #1a1f2e     /* Page background (warm dark) */
--foreground: #ffffff     /* Primary text on background */
--card: #2d3340           /* Card backgrounds (lighter than background) */
--card-foreground: #fff   /* Text on cards */
--border: #404854         /* Borders, dividers */
--muted: #9ca3af          /* Muted text */
--muted-foreground: #6b7280  /* Text on muted backgrounds */
```

## DO ✅

### Backgrounds
```tsx
// Cards and containers
<div className="bg-card">

// Page backgrounds
<div className="bg-background">

// Primary colored backgrounds
<div className="bg-primary">

// Secondary colored backgrounds
<div className="bg-secondary">
```

### Text
```tsx
// Primary text
<p className="text-foreground">

// Text on cards
<p className="text-card-foreground">

// Muted/secondary text
<p className="text-muted-foreground">

// Primary colored text
<span className="text-primary">

// Secondary colored text
<span className="text-secondary">
```

### Borders
```tsx
// Standard borders
<div className="border border-border">

// Primary colored borders
<div className="border-l-4 border-primary">

// Accent colored borders (for semantic meaning)
<div className="border-l-4 border-terracotta">
```

### Buttons (Use shadcn/ui Button Component)
```tsx
import { Button } from '@/components/ui/button'

// Primary action (uses theme primary color)
<Button variant="default">Save</Button>

// Secondary action
<Button variant="outline">Cancel</Button>

// Destructive action
<Button variant="destructive">Delete</Button>
```

## DON'T ❌

### Never Use These Hardcoded Colors
```tsx
// ❌ WRONG - Hardcoded white background
<div className="bg-white">

// ❌ WRONG - Hardcoded gray background
<div className="bg-gray-50">

// ❌ WRONG - Hardcoded blue
<div className="bg-blue-600">

// ❌ WRONG - Hardcoded purple
<div className="bg-purple-600">

// ❌ WRONG - Hardcoded gray borders
<div className="border-gray-200">

// ❌ WRONG - Hardcoded text colors on themed elements
<p className="text-white">  // Use text-foreground instead
<p className="text-gray-900">  // Use text-foreground instead
```

### Exceptions (When Hardcoded Colors Are OK)
```tsx
// ✅ OK - Star ratings (universal pattern)
<Star className="fill-yellow-500 text-yellow-500" />

// ✅ OK - Status indicators with semantic meaning
<Badge className="bg-green-500">Success</Badge>
<Badge className="bg-red-500">Error</Badge>
<Badge className="bg-orange-500">Warning</Badge>

// ✅ OK - Charts/graphs that need specific colors for data visualization
<Bar fill="#3b82f6" />  // Only in chart contexts
```

## Migration Patterns

### Pattern 1: Card Backgrounds
```tsx
// Before
<div className="bg-white rounded-lg shadow p-6">

// After
<div className="bg-card rounded-lg shadow p-6">
```

### Pattern 2: Page Backgrounds
```tsx
// Before
<div className="min-h-screen bg-gray-50">

// After
<div className="min-h-screen bg-background">
```

### Pattern 3: Borders
```tsx
// Before
<div className="border border-gray-200">

// After
<div className="border border-border">
```

### Pattern 4: Text on Dark Backgrounds
```tsx
// Before
<p className="text-white">

// After (on background)
<p className="text-foreground">

// After (on card)
<p className="text-card-foreground">
```

### Pattern 5: Legacy Buttons
```tsx
// Before
<button className="bg-blue-600 text-white px-4 py-2 rounded">
  Click me
</button>

// After (use shadcn Button)
import { Button } from '@/components/ui/button'
<Button>Click me</Button>
```

## Component Examples

### Card Component
```tsx
// ✅ Correct - Theme-aware card
export function MetricCard({ title, value, icon: Icon }) {
  return (
    <div className="bg-card rounded-lg shadow p-6 border border-border">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
    </div>
  )
}
```

### Modal/Dialog
```tsx
// ✅ Correct - Theme-aware modal
export function Modal({ children, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <div className="bg-card rounded-lg shadow-xl max-w-md w-full p-6 border border-border">
        {children}
      </div>
    </div>
  )
}
```

### Table
```tsx
// ✅ Correct - Theme-aware table
export function DataTable({ data }) {
  return (
    <div className="bg-card rounded-lg shadow">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="border-b border-border">
            <tr>
              <th className="text-left p-3 text-sm font-medium text-muted-foreground">
                Name
              </th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr key={row.id} className="border-b border-border hover:bg-muted/10">
                <td className="p-3 text-foreground">{row.name}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

## Tailwind CSS v4 Theming

### How It Works
1. **CSS Variables** defined in `app/globals.css`:
   ```css
   :root {
     --background: #1a1f2e;
     --foreground: #ffffff;
     --card: #2d3340;
     --primary: #FF8243;
   }
   ```

2. **Tailwind Maps Variables** in `@theme` block:
   ```css
   @theme inline {
     --color-background: var(--background);
     --color-foreground: var(--foreground);
     --color-card: var(--card);
     --color-primary: var(--primary);
   }
   ```

3. **Components Use Utility Classes**:
   ```tsx
   <div className="bg-background text-foreground">
   <div className="bg-card text-card-foreground">
   ```

### Benefits
- ✅ Change theme once, updates everywhere
- ✅ Dark/light mode toggle support (future)
- ✅ Consistent branding across app
- ✅ Accessible contrast ratios
- ✅ Easy maintenance

## Common Pitfalls

### 1. Assuming `bg-white` is Safe
```tsx
// ❌ WRONG - Looks fine in light mode, breaks in dark mode
<div className="bg-white text-gray-900">

// ✅ CORRECT - Adapts to theme
<div className="bg-card text-card-foreground">
```

### 2. Using Hardcoded Colors for States
```tsx
// ❌ WRONG - Hardcoded colors
<Badge className={status === 'active' ? 'bg-blue-600' : 'bg-gray-400'}>

// ✅ CORRECT - Theme colors
<Badge className={status === 'active' ? 'bg-primary' : 'bg-muted'}>
```

### 3. Not Using shadcn/ui Components
```tsx
// ❌ WRONG - Custom button styling
<button className="bg-blue-600 hover:bg-blue-700 text-white rounded px-4 py-2">

// ✅ CORRECT - shadcn Button component
import { Button } from '@/components/ui/button'
<Button>Save</Button>
```

## Testing Your Components

### Visual Check
1. View component in browser
2. Check contrast (text should be easily readable)
3. Verify no white-on-white or black-on-black issues
4. Ensure borders are visible

### Code Review Checklist
- [ ] No `bg-white` (use `bg-card` or `bg-background`)
- [ ] No `bg-gray-*` backgrounds (use theme variables)
- [ ] No `bg-blue-*` or `bg-purple-*` (use `bg-primary`)
- [ ] No `border-gray-*` (use `border-border` or `border`)
- [ ] No `text-white` on non-button elements (use `text-foreground`)
- [ ] Using shadcn/ui Button component for buttons
- [ ] All colors adapt to theme

## Automated Theme Enforcement

### Theme Compliance Scanner
**Status**: ✅ **ZERO VIOLATIONS** (as of December 12, 2025)

The project uses automated scanning to enforce theme standards:

```bash
# Run scanner manually
node scripts/check-theme-compliance.js

# Pre-commit hook runs automatically
git commit -m "..." # Scanner runs before commit
```

### Exception Patterns
**Total Exceptions**: 212 patterns (`.theme-exceptions.json`)

**Legitimate Exception Categories**:

1. **Status Indicators** - Semantic colors with universal meaning:
   ```tsx
   <Badge className="bg-green-500">Success</Badge>  // ✅ OK
   <Badge className="bg-red-500">Error</Badge>      // ✅ OK
   <Badge className="bg-orange-500">Warning</Badge> // ✅ OK
   <Badge className="bg-yellow-500">Pending</Badge> // ✅ OK
   ```

2. **Data Visualization** - Charts require specific colors:
   ```tsx
   // margin-by-type-chart.tsx - Profit margin indicators
   <div className="bg-green-500" />  // Excellent (≥30%)
   <div className="bg-blue-500" />   // Good (20-29%)
   <div className="bg-yellow-500" /> // Fair (10-19%)
   <div className="bg-red-500" />    // Poor (<10%)
   ```

3. **Contrast Requirements** - Text on colored backgrounds:
   ```tsx
   <Button className="bg-primary text-white">Save</Button> // ✅ OK
   <div className="bg-orange-500 text-white">Alert</div>   // ✅ OK
   ```

4. **Star Ratings** - Universal pattern:
   ```tsx
   <Star className="fill-yellow-500 text-yellow-500" /> // ✅ OK
   ```

### Adding Exception Patterns

**Pattern Format**: `"path/to/file.tsx:line:color-class"`

**Important**: Escape regex special characters in paths:
- `(dashboard)` → `\\(dashboard\\)`
- `[id]` → `\\[id\\)`

**Examples**:
```json
{
  "allowedPatterns": [
    // Specific line
    "components/ui/badge.tsx:42:bg-green-500",

    // Any line in file (wildcard)
    "components/charts/PieChart.tsx:*:fill-blue-500",

    // All files in directory
    "components/gamification/*:*:bg-yellow-500",

    // Paths with special characters (MUST ESCAPE!)
    "app/\\(dashboard\\)/reports/page.tsx:87:bg-blue-500",
    "app/\\(dashboard\\)/projects/\\[id\\]/page.tsx:*:text-white"
  ]
}
```

### December 2025 Theme Cleanup

**Scope**: 800+ component and page files
**Duration**: 2 sessions (~12 hours total)
**Result**: 97 violations → 0 violations (100% compliance)

**Key Fixes**:
- Fixed 20+ component files with hardcoded colors
- Batch-fixed 5 gamification tabs (text-gray-300 → text-muted-foreground)
- Fixed gradients in error pages (from-gray-50 → from-background)
- Standardized loading spinners (border-blue-600 → border-primary)
- Added 24 exception patterns for legitimate semantic colors

**Established Patterns**:
```tsx
// Loading states
<div className="animate-spin border-b-2 border-primary" />

// Empty states
<div className="bg-muted/30 border-dashed border-border" />

// Muted backgrounds
<div className="bg-muted rounded-lg" />

// Status badges (use semantic colors - add to exceptions)
<Badge className="bg-green-500">Active</Badge>
<Badge className="bg-red-500">Failed</Badge>
```

**Common Replacements**:
- `bg-gray-100` → `bg-muted`
- `bg-gray-50` → `bg-muted/30`
- `border-gray-300` → `border-border`
- `text-blue-600` → `text-primary`
- `hover:bg-blue-700` → `hover:bg-primary/90`
- `text-gray-300` → `text-muted-foreground`

## Resources

- **Tailwind CSS v4 Docs**: https://tailwindcss.com/docs/customizing-colors#using-css-variables
- **Theme Configuration**: `app/globals.css` (lines 46-231)
- **shadcn/ui Components**: https://ui.shadcn.com/docs/components
- **Accessibility**: Use Chrome DevTools accessibility checker
- **Theme Scanner**: `scripts/check-theme-compliance.js`
- **Exception Patterns**: `.theme-exceptions.json` (212 patterns)

## Questions?

If you're unsure whether a color should be hardcoded or use a theme variable:
1. **Ask**: Is this color part of the brand/theme? → Use theme variable
2. **Ask**: Is this color for status/semantic meaning? → Hardcoded is OK
3. **Ask**: Is this color for data visualization? → Hardcoded is OK
4. **When in doubt**: Use theme variable

**Remember**: The goal is consistency and maintainability. Theme variables make it easy to update colors across the entire app in one place.

# 🎨 Theme Customization Guide

**Current Theme**: Coral Jade Afternoon
**Last Updated**: December 12, 2025

## Quick Color Change (5 Minutes)

Want to change the entire color scheme? Just edit **6 hex codes** in one file!

### File to Edit
```
app/globals.css
```

### The 6 Colors to Change (Lines 54-59)

```css
/* Line 71 */ --primary: #FF8243;      /* 🧡 CORAL - Main brand color (buttons, highlights) */
/* Line 75 */ --secondary: #2D7A7A;    /* 🌊 TEAL - Secondary actions, calm elements */
/* Line 91 */ --border: rgba(201, 112, 90, 0.15);  /* Change 201,112,90 to your terracotta RGB */
```

And in the "CORAL JADE EXTENDED PALETTE" section (lines 118-123):

```css
--color-coral: #FF8243;      /* 🧡 Primary brand */
--color-teal: #2D7A7A;       /* 🌊 Secondary/calm */
--color-terracotta: #C9705A; /* 🧱 Warm accents */
--color-cyan: #7DD3D3;       /* 💧 Success/fresh */
--color-brown: #4A3428;      /* 🟤 Grounded/earth */
--color-slate: #3A4045;      /* ⬛ Neutral anchor */
```

## Current Color Palette

| Color | Hex Code | Usage | Emoji |
|-------|----------|-------|-------|
| **Coral** | `#FF8243` | Primary brand, buttons, CTAs | 🧡 |
| **Teal** | `#2D7A7A` | Secondary actions, calm elements | 🌊 |
| **Terracotta** | `#C9705A` | Warm accents, borders | 🧱 |
| **Cyan** | `#7DD3D3` | Success states, highlights | 💧 |
| **Brown** | `#4A3428` | Grounded elements, foundations | 🟤 |
| **Slate** | `#3A4045` | Neutral backgrounds | ⬛ |

## How to Test Changes

1. Edit the hex codes in `app/globals.css`
2. Save the file
3. Refresh your browser (Cmd+R on Mac)
4. Changes apply instantly!

## Pre-Made Alternative Palettes

### Option 1: "Purple Nightfall" (Original)
```css
--primary: #a855f7;      /* Purple */
--secondary: #3b82f6;    /* Blue */
--color-coral: #a855f7;
--color-teal: #2dd4bf;
--color-terracotta: #fb923c;
--color-cyan: #22c55e;
--color-brown: #64748b;
--color-slate: #3A4045;
```

### Option 2: "Forest Green Professional"
```css
--primary: #10b981;      /* Emerald green */
--secondary: #0891b2;    /* Cyan */
--color-coral: #10b981;
--color-teal: #0891b2;
--color-terracotta: #84cc16;
--color-cyan: #06b6d4;
--color-brown: #064e3b;
--color-slate: #374151;
```

### Option 3: "Deep Blue Corporate"
```css
--primary: #3b82f6;      /* Blue */
--secondary: #06b6d4;    /* Sky blue */
--color-coral: #3b82f6;
--color-teal: #0284c7;
--color-terracotta: #0ea5e9;
--color-cyan: #7dd3fc;
--color-brown: #1e40af;
--color-slate: #334155;
```

## What Changes Automatically

When you update the 6 hex codes, these elements update automatically:

✅ All buttons (primary, secondary, accent)
✅ All metric cards and highlights
✅ Charts and data visualizations
✅ Sidebar active states
✅ Focus rings and borders
✅ Gradient text
✅ Hover effects and glows
✅ Pipeline stage colors

## Advanced: Custom Gradients

Want custom button gradients? Edit these sections:

### Button Gradients (components/ui/button.tsx)
Look for classes like:
```tsx
className="bg-gradient-to-r from-primary to-primary/80"
```

Change to your custom gradient:
```tsx
className="bg-gradient-to-r from-coral to-terracotta"
```

### Card Gradients (Dashboard components)
Look for:
```css
background: linear-gradient(135deg, rgba(255, 130, 67, 0.1) 0%, rgba(45, 122, 122, 0.05) 100%)
```

## Need Help?

If colors look off:
1. Clear browser cache (Cmd+Shift+R on Mac)
2. Check `app/globals.css` was saved
3. Restart the dev server: `npm run dev`

## Color Psychology Reference

- **Warm colors** (coral, terracotta, brown) = Energy, trust, construction
- **Cool colors** (teal, cyan, slate) = Professional, calming, stable
- **Avoid**: Pure yellow (looks cheap), neon colors (not professional)

## Theme Philosophy

**"Coral Jade Afternoon"** uses:
- **Warm** coral/terracotta for energy and attention
- **Cool** teal/cyan for professionalism and balance
- **Earthy** brown for construction authenticity
- **Neutral** slate for clean foundations

This creates a sophisticated, roofing-industry-appropriate aesthetic that doesn't look like a generic AI template.

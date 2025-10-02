# Tailwind CSS Troubleshooting Guide

## 🐛 Common Issues & Solutions

### 1. Black Tiles / Images Not Displaying

**Problem:** Images appear as black tiles or don't display properly in gallery layouts.

**Root Causes:**
- `aspect-square` class conflicting with absolute positioning
- Missing parent `relative` container
- Object-fit not properly applied
- Next.js Image component conflicts

**Solution:**
```jsx
// ❌ PROBLEMATIC - Causes black tiles
<div className="aspect-square relative">
  <img className="absolute inset-0 object-cover" src={url} />
</div>

// ✅ WORKING - Use inline styles for problematic components
<img
  src={photo.file_url}
  style={{
    width: '100%',
    height: '200px',
    objectFit: 'cover',
    borderRadius: '8px',
    display: 'block'
  }}
/>
```

### 2. Aspect Ratio Not Working

**Problem:** Aspect ratio utilities have no effect or produce unexpected results.

**Requirements:**
- Parent container must have a defined width
- Container needs proper dimension context

**Solution:**
```jsx
// ✅ Ensure parent has width
<div className="w-full"> {/* Parent needs width */}
  <div className="aspect-video"> {/* Now aspect ratio works */}
    <img className="w-full h-full object-cover" />
  </div>
</div>
```

### 3. Absolute Positioning Issues

**Problem:** Absolutely positioned elements not appearing where expected.

**Solution:**
```jsx
// ✅ Always use relative on parent
<div className="relative"> {/* REQUIRED for absolute children */}
  <img className="w-full h-full object-cover" />
  <button className="absolute top-2 right-2">
    Delete
  </button>
</div>
```

### 4. Responsive Design Breakpoints

**Problem:** Layout breaks on different screen sizes.

**Solution:**
```jsx
// ✅ Use responsive modifiers
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
  {/* Responsive grid */}
</div>

// ✅ Responsive aspect ratios
<div className="aspect-square sm:aspect-video lg:aspect-[16/9]">
  {/* Different ratios for different screens */}
</div>
```

## 🔍 Debugging Checklist

### When Images Don't Display:

1. **Test with colored div first:**
```jsx
// Step 1: Verify layout with colored div
<div style={{ width: '200px', height: '200px', backgroundColor: 'red' }} />

// Step 2: If layout works, add image
<img src={url} style={{ width: '200px', height: '200px' }} />

// Step 3: Gradually add Tailwind classes
```

2. **Check parent containers:**
- Does parent have `relative` if child uses `absolute`?
- Does parent have defined dimensions?
- Is there a flex or grid context?

3. **Verify image source:**
- Check network tab for 404s
- Ensure URL is properly formatted
- Check CORS/domain configuration

### When Positioning Fails:

1. **Positioning Context:**
```jsx
// Check each level of nesting
<div> {/* static (default) */}
  <div className="relative"> {/* positioning context */}
    <div className="absolute"> {/* positioned relative to parent */}
```

2. **Z-index Issues:**
```jsx
// Ensure proper stacking
<div className="relative z-0">
  <img className="relative z-10" /> {/* Image on top */}
  <div className="absolute z-20"> {/* Overlay on top of image */}
</div>
```

## 💡 Best Practices

### 1. Start Simple, Add Complexity
```jsx
// Start with inline styles
<img style={{ width: '100%', height: 'auto' }} />

// Then migrate to Tailwind
<img className="w-full h-auto" />
```

### 2. Use DevTools Effectively
- Inspect computed styles
- Check for conflicting CSS
- Verify box model dimensions
- Look for `display: none` or `visibility: hidden`

### 3. Common Utility Combinations
```jsx
// Image galleries
<div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
  <div className="relative group">
    <img className="w-full h-48 object-cover rounded-lg" />
    <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity">
      {/* Overlay content */}
    </div>
  </div>
</div>

// Cards with images
<div className="overflow-hidden rounded-lg shadow-lg">
  <div className="aspect-w-16 aspect-h-9">
    <img className="object-cover" />
  </div>
  <div className="p-4">
    {/* Card content */}
  </div>
</div>
```

## 🚫 Avoid These Patterns

1. **Don't mix aspect-ratio with explicit heights:**
```jsx
// ❌ BAD
<div className="aspect-square h-64">

// ✅ GOOD - Choose one approach
<div className="aspect-square">
// OR
<div className="h-64 w-64">
```

2. **Don't forget object-fit with aspect ratios:**
```jsx
// ❌ Images will stretch
<div className="aspect-video">
  <img className="w-full h-full" />
</div>

// ✅ Images maintain aspect ratio
<div className="aspect-video">
  <img className="w-full h-full object-cover" />
</div>
```

3. **Don't use absolute without relative parent:**
```jsx
// ❌ Will position relative to page/nearest positioned ancestor
<div>
  <div className="absolute top-0 right-0">

// ✅ Positions relative to parent
<div className="relative">
  <div className="absolute top-0 right-0">
```

## 🔧 Quick Fixes

### Problem: Black tiles in gallery
```jsx
// Replace Tailwind classes with inline styles
style={{
  width: '100%',
  height: '200px',
  objectFit: 'cover',
  display: 'block'
}}
```

### Problem: Delete button not visible
```jsx
// Ensure proper z-index and positioning
<div className="relative">
  <img />
  <button className="absolute top-2 right-2 z-10 bg-white">
```

### Problem: Responsive layout broken
```jsx
// Use responsive grid
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
```

## 📚 Resources

- [Tailwind CSS Docs - Aspect Ratio](https://tailwindcss.com/docs/aspect-ratio)
- [Tailwind CSS Docs - Position](https://tailwindcss.com/docs/position)
- [Tailwind CSS Docs - Object Fit](https://tailwindcss.com/docs/object-fit)
- [Tailwind CSS Docs - Responsive Design](https://tailwindcss.com/docs/responsive-design)

## 🆘 Emergency Fallback

When Tailwind causes issues and you need a quick fix:

```jsx
// Create a CSS module file: styles.module.css
.imageGallery {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1rem;
}

.imageCard {
  position: relative;
  width: 100%;
  height: 200px;
  overflow: hidden;
  border-radius: 8px;
}

.image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

// Use in component
import styles from './styles.module.css';

<div className={styles.imageGallery}>
  <div className={styles.imageCard}>
    <img className={styles.image} src={url} />
  </div>
</div>
```

---

*Last Updated: October 2, 2025*
*Based on real debugging session with Photo Gallery component*
# Roofing SaaS - Code Standards

**Read this before writing any code.**

---

## Critical Lint Rules

These rules are **enforced** and will fail builds if violated:

### 1. NO Hardcoded Colors (theme-compliance/no-hardcoded-colors)

**NEVER use Tailwind color classes directly.** Use theme tokens instead.

```tsx
// BAD - Will fail lint
<div className="bg-white text-gray-900 border-gray-300">
<div className="bg-blue-600 text-blue-800">
<div className="text-gray-500 bg-gray-50">

// GOOD - Use theme tokens
<div className="bg-background text-foreground border-border">
<div className="bg-primary text-primary-foreground">
<div className="text-muted-foreground bg-muted">
```

**Color Token Reference:**
| Instead of | Use |
|------------|-----|
| `bg-white` | `bg-background` or `bg-card` |
| `bg-gray-50/100` | `bg-muted` |
| `bg-blue-600` | `bg-primary` |
| `text-gray-900` | `text-foreground` |
| `text-gray-500/600` | `text-muted-foreground` |
| `text-white` | `text-primary-foreground` |
| `border-gray-*` | `border-border` |

### 2. NO `any` Type (@typescript-eslint/no-explicit-any)

**Always use proper types.** Never use `any`.

```tsx
// BAD
const data: any = fetchData()
function process(item: any) {}

// GOOD
const data: ProjectTemplate = fetchData()
function process(item: ProjectTemplate) {}

// If truly unknown, use `unknown` and narrow
const data: unknown = fetchData()
if (isProjectTemplate(data)) { ... }
```

### 3. NO Unused Variables (@typescript-eslint/no-unused-vars)

**Only import what you use.** Remove unused imports immediately.

```tsx
// BAD - Unused imports
import { Button, Card, Badge, Dialog } from '@/components/ui'
// Only Button is used...

// GOOD - Only import what's needed
import { Button } from '@/components/ui/button'
```

If you need to keep a variable for future use, prefix with underscore:
```tsx
const [_unused, setUsed] = useState(false)
```

### 4. React Hooks Rules

**useEffect dependencies must be complete** or explicitly disabled:

```tsx
// BAD - Missing dependencies
useEffect(() => {
  loadData()
}, [])  // loadData is missing

// GOOD - Option A: Include dependencies
useEffect(() => {
  loadData()
}, [loadData])

// GOOD - Option B: Explicit disable with comment
useEffect(() => {
  loadData()
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [])
```

### 5. Escape Entities in JSX

```tsx
// BAD
<p>Don't use "quotes" directly</p>

// GOOD
<p>Don&apos;t use &ldquo;quotes&rdquo; directly</p>
```

### 6. Use `const` Over `let`

If a variable is never reassigned, use `const`:

```tsx
// BAD
let items = data.filter(x => x.active)

// GOOD
const items = data.filter(x => x.active)
```

---

## UI Component Patterns

### Available UI Components

Check `/components/ui/` before importing. Common components:
- `button`, `card`, `badge`, `input`, `label`
- `dialog`, `alert-dialog`, `dropdown-menu`
- `table`, `tabs`, `select`, `separator`
- `skeleton`, `tooltip`, `form`

**Before using a component, verify it exists:**
```bash
ls components/ui/
```

### Form Patterns

Use React Hook Form with Zod:
```tsx
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const schema = z.object({
  name: z.string().min(1, 'Required'),
})

const { register, handleSubmit } = useForm({
  resolver: zodResolver(schema)
})
```

---

## File Structure

```
app/                    # Next.js App Router pages
  (dashboard)/          # Authenticated routes
  api/                  # API routes
components/
  ui/                   # Shadcn UI components
  [feature]/            # Feature-specific components
lib/
  types/                # TypeScript interfaces
  validations/          # Zod schemas
  utils.ts              # Utility functions
```

---

## Before Committing

Run these checks:
```bash
npm run lint          # Must pass with 0 warnings
npm run typecheck     # Must pass
npm run build         # Must succeed
```

---

## Summary Checklist

Before writing any code, verify:
- [ ] Using theme tokens, not hardcoded colors
- [ ] All types are explicit (no `any`)
- [ ] Only importing what I use
- [ ] useEffect dependencies are handled
- [ ] JSX entities are escaped
- [ ] UI components exist before importing

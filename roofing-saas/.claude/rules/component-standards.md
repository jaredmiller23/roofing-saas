# Component Standards & UI Conventions

**Applies to**: `**/components/**`, `**/app/**`
**Last Updated**: December 10, 2025

## File Structure

### Component Organization
```
components/
├── ui/              # shadcn/ui base components
├── forms/           # Form components with validation
├── filters/         # Filter-related components
├── settings/        # Settings page components
├── [feature]/       # Feature-specific components
│   ├── FeatureName.tsx
│   ├── FeatureList.tsx
│   └── index.ts
```

### Naming Conventions
- **Components**: PascalCase (`ContactCard.tsx`)
- **Hooks**: camelCase with `use` prefix (`useContacts.ts`)
- **Utils**: camelCase (`formatPhoneNumber.ts`)
- **Types**: PascalCase with descriptive suffix (`ContactFormData`, `ContactListProps`)

## Component Patterns

### Client Components
```typescript
'use client';

import { useState, useEffect } from 'react';

interface ComponentProps {
  // Always define explicit props interface
}

export function Component({ prop1, prop2 }: ComponentProps) {
  // Hooks first
  const [state, setState] = useState();

  // Effects second
  useEffect(() => {
    // ...
  }, [dependencies]);

  // Handlers third
  const handleClick = () => { /* ... */ };

  // Render last
  return (/* ... */);
}
```

### Server Components (Default)
```typescript
// No 'use client' - server by default in App Router

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function Page({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { page } = await searchParams;
  // Fetch data directly
  // Return JSX
}
```

## shadcn/ui Usage

### Import Pattern
```typescript
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
```

### Form Pattern with React Hook Form + Zod
```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';

const formSchema = z.object({
  name: z.string().min(1, 'Required'),
  email: z.string().email('Invalid email'),
});

type FormData = z.infer<typeof formSchema>;

export function MyForm() {
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: '', email: '' },
  });

  const onSubmit = async (data: FormData) => { /* ... */ };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </form>
    </Form>
  );
}
```

## Loading & Error States

### Loading Pattern
```typescript
import { Skeleton } from '@/components/ui/skeleton';

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-12 w-full" />
    </div>
  );
}
```

### Error Boundary Pattern
```typescript
'use client';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center p-8">
      <h2 className="text-xl font-bold">Something went wrong!</h2>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
```

## Responsive Design

### Mobile-First with Tailwind
```typescript
<div className="
  grid grid-cols-1          // Mobile: 1 column
  md:grid-cols-2            // Tablet: 2 columns
  lg:grid-cols-3            // Desktop: 3 columns
  gap-4
">
```

### Common Breakpoints
- `sm`: 640px (small tablet)
- `md`: 768px (tablet)
- `lg`: 1024px (laptop)
- `xl`: 1280px (desktop)
- `2xl`: 1536px (large desktop)

## State Management

### Context for Shared State
```typescript
// lib/feature/context.tsx
'use client';

const FeatureContext = createContext<FeatureContextType | null>(null);

export function FeatureProvider({ children }: { children: React.ReactNode }) {
  // State and handlers
  return (
    <FeatureContext.Provider value={/* ... */}>
      {children}
    </FeatureContext.Provider>
  );
}

export function useFeature() {
  const context = useContext(FeatureContext);
  if (!context) throw new Error('useFeature must be used within FeatureProvider');
  return context;
}
```

## Accessibility

### Always Include
- `aria-label` on icon-only buttons
- `alt` text on images
- Keyboard navigation support
- Focus states (shadcn handles most)
- Screen reader text for visual-only content

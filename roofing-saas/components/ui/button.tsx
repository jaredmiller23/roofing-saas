import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive:
          "bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
        outline:
          "border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost:
          "hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
        icon: "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  children,
  "aria-label": ariaLabel,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  // Check if button is icon-only (contains only SVG elements or icons, no text)
  const isIconOnly = React.useMemo(() => {
    const childrenArray = React.Children.toArray(children)
    if (childrenArray.length === 0) return true // Empty button is icon-only

    return childrenArray.every((child) => {
      if (React.isValidElement(child)) {
        // Check for SVG elements or icon components (commonly from lucide-react)
        return child.type === 'svg' ||
               (typeof child.type === 'function' &&
                (child.type as any).displayName?.includes('Icon')) ||
               // Check if it's a Lucide icon component
               (child.props as any)?.className?.includes('lucide')
      }
      // If it's a text node, check if it's empty or whitespace only
      return typeof child === 'string' && child.trim().length === 0
    })
  }, [children])

  // Comprehensive accessibility warnings for development
  React.useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      // Warn if icon-only button lacks aria-label
      if (isIconOnly && !ariaLabel && !props['aria-labelledby']) {
        console.warn('Button: Icon-only buttons must have an aria-label or aria-labelledby for accessibility')
      }

      // Additional warning for buttons without sufficient labeling
      if (!ariaLabel && !props['aria-labelledby'] && !children) {
        console.warn('Button: Empty buttons must have an aria-label or aria-labelledby for accessibility')
      }

      // Warn about disabled state accessibility
      if (props.disabled && !props['aria-describedby']) {
        console.warn('Button: Disabled buttons should include aria-describedby to explain why they are disabled')
      }
    }
  }, [isIconOnly, ariaLabel, props, children])

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      aria-label={ariaLabel}
      // Ensure proper button semantics when using asChild with non-button elements
      role={asChild && !props.role ? "button" : props.role}
      // Add tabIndex for keyboard navigation when using asChild
      tabIndex={asChild && props.tabIndex === undefined ? 0 : props.tabIndex}
      {...props}
    >
      {children}
    </Comp>
  )
}

export { Button, buttonVariants }

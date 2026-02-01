'use client'

import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<
  HTMLInputElement,
  React.ComponentProps<"input"> & {
    "aria-invalid"?: boolean | "false" | "true" | "grammar" | "spelling"
  }
>(({ className, type, id, "aria-describedby": ariaDescribedby, "aria-invalid": ariaInvalid, ...props }, ref) => {
  // Comprehensive accessibility warnings for development
  React.useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      // Warn if input lacks proper labeling
      if (!props['aria-label'] && !props['aria-labelledby'] && !id) {
        console.warn('Input: Input should have an associated label (via htmlFor), aria-label, or aria-labelledby for accessibility')
      }

      // Additional accessibility warning for required fields without indication
      if (props.required && !props['aria-required']) {
        console.warn('Input: Required inputs should have aria-required="true" for accessibility')
      }

      // Warn about invalid state without description
      if ((ariaInvalid === true || ariaInvalid === "true") && !ariaDescribedby) {
        console.warn('Input: Invalid inputs should have aria-describedby pointing to error message for accessibility')
      }

      // Warn about password inputs without proper labeling
      if (type === 'password' && !ariaDescribedby) {
        console.warn('Input: Password inputs should have aria-describedby pointing to password requirements for accessibility')
      }
    }
  }, [props, id, ariaDescribedby, ariaInvalid, type])

  return (
    <input
      ref={ref}
      type={type}
      id={id}
      data-slot="input"
      className={cn(
        "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input h-11 w-full min-w-0 rounded-md border bg-transparent px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm", // h-11 = 44px touch target minimum
        // Enhanced focus indicators for better visibility
        "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none",
        // Enhanced invalid state indicators
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        // High contrast focus for better accessibility
        "focus:ring-offset-background focus-visible:ring-offset-2",
        className
      )}
      aria-describedby={ariaDescribedby}
      aria-required={props.required ? 'true' : undefined}
      aria-invalid={ariaInvalid}
      // Ensure autocomplete is properly handled for accessibility
      autoComplete={props.autoComplete || (type === 'email' ? 'email' : type === 'password' ? 'current-password' : undefined)}
      {...props}
    />
  )
})

Input.displayName = "Input"

export { Input }

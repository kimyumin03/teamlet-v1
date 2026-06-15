import * as React from 'react'
import { cn } from './cn'

// 원본 @teamlet/ui Input 그대로.
export type InputProps = React.InputHTMLAttributes<HTMLInputElement>

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = 'text', ...props }, ref) => {
    return (
      <input
        ref={ref}
        type={type}
        className={cn(
          'flex h-10 w-full rounded-md border border-border bg-background-primary px-3 py-2 text-base text-foreground',
          'placeholder:text-foreground-subtle',
          'focus-visible:outline-none focus-visible:border-border-focus focus-visible:shadow-focus',
          'disabled:cursor-not-allowed disabled:bg-background-muted disabled:opacity-60',
          'aria-[invalid=true]:border-destructive-500',
          className,
        )}
        {...props}
      />
    )
  },
)
Input.displayName = 'Input'

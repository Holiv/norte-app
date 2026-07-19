import { forwardRef, type SelectHTMLAttributes } from 'react'

const base =
  'w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink transition-colors duration-150 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 disabled:opacity-50'

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className = '', ...props }, ref) {
    return <select ref={ref} className={`${base} ${className}`} {...props} />
  },
)

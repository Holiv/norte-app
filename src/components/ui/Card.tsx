import type { HTMLAttributes } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Desliga o padding padrão (p-4) para layouts com padding interno próprio. */
  padding?: boolean
}

export function Card({ className = '', padding = true, ...props }: CardProps) {
  return (
    <div
      className={`rounded-xl border border-border bg-surface ${padding ? 'p-4' : ''} ${className}`}
      {...props}
    />
  )
}

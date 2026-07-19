import type { ReactNode } from 'react'

type Tone = 'primary' | 'warning' | 'negative' | 'neutral'

const tones: Record<Tone, string> = {
  primary: 'bg-primary-muted text-primary',
  warning: 'bg-warning/15 text-warning',
  negative: 'bg-negative/15 text-negative',
  neutral: 'bg-surface-2 text-ink-muted',
}

export function Badge({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${tones[tone]}`}
    >
      {children}
    </span>
  )
}

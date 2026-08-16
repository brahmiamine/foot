import type { HTMLAttributes } from 'react'

export type BadgeVariant = 'neutral' | 'success' | 'warning' | 'danger' | 'info'

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
}

export function Badge({ variant = 'neutral', className = '', ...props }: BadgeProps) {
  const classes = ['foot-badge', `foot-badge--${variant}`, className]
    .filter(Boolean)
    .join(' ')

  return <span className={classes} {...props} />
}

import type { HTMLAttributes } from 'react'

export type CardPadding = 'none' | 'sm' | 'md' | 'lg'

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: CardPadding
  interactive?: boolean
}

export function Card({
  padding = 'md',
  interactive = false,
  className = '',
  ...props
}: CardProps) {
  const classes = [
    'foot-card',
    `foot-card--${padding}`,
    interactive ? 'foot-card--interactive' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return <div className={classes} {...props} />
}

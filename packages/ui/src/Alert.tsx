import type { HTMLAttributes, ReactNode } from 'react'

export type AlertVariant = 'info' | 'success' | 'warning' | 'danger'

export interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  variant?: AlertVariant
  title?: ReactNode
}

export function Alert({ variant = 'info', title, className = '', children, ...props }: AlertProps) {
  const classes = ['foot-alert', `foot-alert--${variant}`, className]
    .filter(Boolean)
    .join(' ')
  const role = variant === 'danger' ? 'alert' : 'status'

  return (
    <div className={classes} role={role} {...props}>
      {title ? <div className="foot-alert__title">{title}</div> : null}
      {children ? <div className="foot-alert__content">{children}</div> : null}
    </div>
  )
}

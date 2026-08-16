import type { HTMLAttributes, ReactNode } from 'react'

export interface PageHeaderProps extends HTMLAttributes<HTMLElement> {
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
}

export function PageHeader({
  title,
  description,
  actions,
  className = '',
  ...props
}: PageHeaderProps) {
  const classes = ['foot-page-header', className].filter(Boolean).join(' ')

  return (
    <header className={classes} {...props}>
      <div className="foot-page-header__copy">
        <h1 className="foot-page-header__title">{title}</h1>
        {description ? <p className="foot-page-header__description">{description}</p> : null}
      </div>
      {actions ? <div className="foot-page-header__actions">{actions}</div> : null}
    </header>
  )
}

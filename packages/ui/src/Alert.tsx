import type { HTMLAttributes, ReactNode } from 'react'
import styled, { css } from 'styled-components'

export type AlertVariant = 'info' | 'success' | 'warning' | 'danger'

export interface AlertProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  variant?: AlertVariant
  title?: ReactNode
}

const variantStyles: Record<AlertVariant, ReturnType<typeof css>> = {
  info: css`
    border-color: rgba(74, 144, 164, 0.4);
    background: rgba(74, 144, 164, 0.08);
  `,
  success: css`
    border-color: rgba(63, 167, 114, 0.4);
    background: rgba(63, 167, 114, 0.08);
  `,
  warning: css`
    border-color: rgba(217, 154, 61, 0.45);
    background: rgba(217, 154, 61, 0.09);
  `,
  danger: css`
    border-color: rgba(214, 69, 90, 0.45);
    background: rgba(214, 69, 90, 0.08);
  `,
}

const roleForVariant: Record<AlertVariant, 'status' | 'alert'> = {
  info: 'status',
  success: 'status',
  warning: 'alert',
  danger: 'alert',
}

const StyledAlert = styled.div<{ $variant: AlertVariant }>`
  min-width: 0;
  max-width: 100%;
  padding: 0.875rem 1rem;
  border: 1px solid var(--foot-color-border);
  border-radius: var(--foot-radius-md);
  background: var(--foot-color-surface);
  color: var(--foot-color-text);
  font-family: var(--foot-font-ui);
  overflow-wrap: anywhere;

  ${(p) => variantStyles[p.$variant]}
`

const AlertTitle = styled.div`
  font-weight: 800;
`

const AlertContent = styled.div`
  margin-top: 0.25rem;
  line-height: 1.5;
`

export function Alert({ variant = 'info', title, children, ...rest }: AlertProps) {
  return (
    <StyledAlert
      $variant={variant}
      role={roleForVariant[variant]}
      aria-live={variant === 'danger' ? 'assertive' : 'polite'}
      {...rest}
    >
      {title && <AlertTitle>{title}</AlertTitle>}
      <AlertContent>{children}</AlertContent>
    </StyledAlert>
  )
}

import type { HTMLAttributes } from 'react'
import styled, { css } from 'styled-components'

export type BadgeVariant = 'neutral' | 'success' | 'warning' | 'danger' | 'info'

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
}

const variantStyles: Record<BadgeVariant, ReturnType<typeof css>> = {
  neutral: css`
    background: rgba(100, 116, 139, 0.12);
    color: #475569;

    :root.dark & {
      color: #d7dde6;
    }
  `,
  success: css`
    background: rgba(63, 167, 114, 0.14);
    color: #23734d;

    :root.dark & {
      color: #8bd7ae;
    }
  `,
  warning: css`
    background: rgba(217, 154, 61, 0.16);
    color: #865812;

    :root.dark & {
      color: #f0c47c;
    }
  `,
  danger: css`
    background: rgba(214, 69, 90, 0.13);
    color: #a3263a;

    :root.dark & {
      color: #f2a2ae;
    }
  `,
  info: css`
    background: rgba(74, 144, 164, 0.14);
    color: #285f70;

    :root.dark & {
      color: #9bc7d3;
    }
  `,
}

const StyledBadge = styled.span<{ $variant: BadgeVariant }>`
  display: inline-flex;
  align-items: center;
  width: fit-content;
  max-width: 100%;
  min-height: 1.5rem;
  padding: 0.2rem 0.55rem;
  border-radius: 999px;
  font-family: var(--foot-font-ui);
  font-size: 0.75rem;
  font-weight: 700;
  line-height: 1.2;
  white-space: normal;
  overflow-wrap: anywhere;

  ${(p) => variantStyles[p.$variant]}
`

export function Badge({ variant = 'neutral', children, ...rest }: BadgeProps) {
  return (
    <StyledBadge $variant={variant} {...rest}>
      {children}
    </StyledBadge>
  )
}

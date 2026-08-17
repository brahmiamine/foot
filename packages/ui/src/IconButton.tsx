import { forwardRef } from 'react'
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import styled, { css } from 'styled-components'
import { focusRing } from './internal/mixins'
import type { ButtonSize, ButtonVariant } from './Button'

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: ReactNode
  /** Required: IconButton has no visible text, so an accessible name is mandatory. */
  'aria-label': string
  variant?: ButtonVariant
  size?: ButtonSize
}

const dimensions: Record<ButtonSize, string> = {
  sm: '2rem',
  md: '2.5rem',
  lg: '3rem',
}

const variantStyles: Record<ButtonVariant, ReturnType<typeof css>> = {
  primary: css`
    background: var(--foot-color-primary);
    border-color: var(--foot-color-primary);
    color: #fff;

    &:hover:not(:disabled) {
      background: var(--foot-color-primary-dark);
      border-color: var(--foot-color-primary-dark);
    }
  `,
  secondary: css`
    background: var(--foot-color-surface);
    border-color: var(--foot-color-border);
    color: var(--foot-color-text);

    &:hover:not(:disabled) {
      border-color: var(--foot-color-secondary);
    }
  `,
  danger: css`
    background: var(--foot-color-danger);
    border-color: var(--foot-color-danger);
    color: #fff;

    &:hover:not(:disabled) {
      filter: brightness(0.92);
    }
  `,
  ghost: css`
    background: transparent;
    border-color: transparent;
    color: var(--foot-color-text);

    &:hover:not(:disabled) {
      background: rgba(var(--foot-color-primary-rgb), 0.08);
    }
  `,
}

const StyledIconButton = styled.button<{ $variant: ButtonVariant; $size: ButtonSize }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: ${(p) => dimensions[p.$size]};
  height: ${(p) => dimensions[p.$size]};
  border: 1px solid transparent;
  border-radius: var(--foot-radius-sm);
  cursor: pointer;
  transition:
    background-color 0.2s ease,
    border-color 0.2s ease,
    color 0.2s ease;

  ${(p) => variantStyles[p.$variant]}
  ${focusRing}

  &:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }

  svg {
    width: 1.1em;
    height: 1.1em;
  }

  @media (max-width: 640px) {
    min-width: var(--foot-touch-target);
    min-height: var(--foot-touch-target);
  }

  @media (prefers-reduced-motion: reduce) {
    transition-duration: 0.001ms;
  }
`

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { icon, variant = 'secondary', size = 'md', type = 'button', ...rest },
  ref,
) {
  return (
    <StyledIconButton ref={ref} type={type} $variant={variant} $size={size} {...rest}>
      {icon}
    </StyledIconButton>
  )
})

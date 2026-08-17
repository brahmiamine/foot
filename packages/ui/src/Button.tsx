import { forwardRef } from 'react'
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import styled, { css } from 'styled-components'
import { focusRing } from './internal/mixins'

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost'
export type ButtonSize = 'sm' | 'md' | 'lg'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  fullWidth?: boolean
  /** Renders a leading icon/element before the label. */
  startIcon?: ReactNode
  /** Renders a trailing icon/element after the label. */
  endIcon?: ReactNode
}

const sizeStyles = {
  sm: css`
    min-height: 2rem;
    padding: 0.45rem 0.75rem;
    font-size: 0.8125rem;
  `,
  md: css`
    min-height: 2.5rem;
    padding: 0.65rem 1rem;
    font-size: 0.875rem;
  `,
  lg: css`
    min-height: 3rem;
    padding: 0.8rem 1.25rem;
    font-size: 1rem;
  `,
}

const variantStyles = {
  primary: css`
    background: var(--foot-color-primary);
    border-color: var(--foot-color-primary);
    color: #fff;

    &:hover:not(:disabled) {
      background: var(--foot-color-primary-dark);
      border-color: var(--foot-color-primary-dark);
      transform: translateY(-1px);
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
    color: var(--foot-color-primary);

    &:hover:not(:disabled) {
      background: rgba(var(--foot-color-primary-rgb), 0.08);
    }
  `,
}

const StyledButton = styled.button<{
  $variant: ButtonVariant
  $size: ButtonSize
  $fullWidth: boolean
}>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  min-width: 0;
  max-width: 100%;
  width: ${(p) => (p.$fullWidth ? '100%' : 'auto')};
  border: 1px solid transparent;
  border-radius: var(--foot-radius-sm);
  font-family: var(--foot-font-ui);
  font-weight: 700;
  line-height: 1;
  text-align: center;
  white-space: normal;
  cursor: pointer;
  transition:
    background-color 0.2s ease,
    border-color 0.2s ease,
    color 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.2s ease;

  ${(p) => sizeStyles[p.$size]}
  ${(p) => variantStyles[p.$variant]}
  ${focusRing}

  &:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }

  @media (max-width: 640px) {
    min-height: var(--foot-touch-target);
  }

  @media (prefers-reduced-motion: reduce) {
    transition-duration: 0.001ms;

    &:hover:not(:disabled) {
      transform: none;
    }
  }
`

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', fullWidth = false, startIcon, endIcon, children, type = 'button', ...rest },
  ref,
) {
  return (
    <StyledButton ref={ref} type={type} $variant={variant} $size={size} $fullWidth={fullWidth} {...rest}>
      {startIcon}
      {children}
      {endIcon}
    </StyledButton>
  )
})

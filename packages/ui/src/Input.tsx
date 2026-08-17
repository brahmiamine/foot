import { forwardRef } from 'react'
import type { InputHTMLAttributes } from 'react'
import styled, { css } from 'styled-components'
import { focusRing } from './internal/mixins'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean
}

export const inputBaseStyles = css`
  display: block;
  width: 100%;
  min-width: 0;
  max-width: 100%;
  min-height: 2.5rem;
  padding: 0.625rem 0.75rem;
  border: 1px solid var(--foot-color-border);
  border-radius: var(--foot-radius-sm);
  background: var(--foot-color-surface);
  color: var(--foot-color-text);
  font-family: var(--foot-font-ui);
  font-size: 0.875rem;
  line-height: 1.4;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease;

  &::placeholder {
    color: var(--foot-color-text-muted);
    opacity: 1;
  }

  &:hover:not(:disabled) {
    border-color: var(--foot-color-secondary);
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.65;
  }

  ${focusRing}

  @media (max-width: 640px) {
    min-height: var(--foot-touch-target);
    font-size: max(1rem, 16px);
  }

  @media (prefers-reduced-motion: reduce) {
    transition-duration: 0.001ms;
  }
`

const StyledInput = styled.input<{ $invalid: boolean }>`
  ${inputBaseStyles}

  ${(p) =>
    p.$invalid &&
    css`
      border-color: var(--foot-color-danger);
    `}
`

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { invalid = false, 'aria-invalid': ariaInvalid, ...rest },
  ref,
) {
  return (
    <StyledInput
      ref={ref}
      $invalid={invalid}
      aria-invalid={ariaInvalid ?? (invalid || undefined)}
      {...rest}
    />
  )
})

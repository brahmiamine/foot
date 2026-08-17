import { forwardRef, useId } from 'react'
import type { InputHTMLAttributes, ReactNode } from 'react'
import styled from 'styled-components'
import { focusRing } from './internal/mixins'

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: ReactNode
  /** Sets the native `indeterminate` DOM property (a visual third state). */
  indeterminate?: boolean
}

const Row = styled.label`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 0;
  max-width: 100%;
  font-family: var(--foot-font-ui);
  font-size: 0.875rem;
  color: var(--foot-color-text);
  cursor: pointer;

  &:has(input:disabled) {
    cursor: not-allowed;
    opacity: 0.6;
  }
`

const Box = styled.input`
  appearance: none;
  flex-shrink: 0;
  width: 1.15rem;
  height: 1.15rem;
  margin: 0;
  border: 1px solid var(--foot-color-border);
  border-radius: 0.3rem;
  background: var(--foot-color-surface);
  cursor: pointer;
  display: inline-grid;
  place-content: center;
  transition:
    background-color 0.2s ease,
    border-color 0.2s ease;

  &::before {
    content: '';
    width: 0.65rem;
    height: 0.65rem;
    clip-path: polygon(14% 44%, 0 65%, 50% 100%, 100% 16%, 80% 0%, 45% 62%);
    transform: scale(0);
    transition: transform 0.12s ease;
    background: #fff;
  }

  &:checked {
    background: var(--foot-color-primary);
    border-color: var(--foot-color-primary);
  }

  &:checked::before {
    transform: scale(1);
  }

  &:indeterminate {
    background: var(--foot-color-primary);
    border-color: var(--foot-color-primary);
  }

  &:indeterminate::before {
    clip-path: none;
    width: 0.6rem;
    height: 0.15rem;
    transform: scale(1);
  }

  &:disabled {
    cursor: not-allowed;
  }

  ${focusRing}

  @media (max-width: 640px) {
    width: 1.35rem;
    height: 1.35rem;
  }

  @media (prefers-reduced-motion: reduce) {
    transition-duration: 0.001ms;

    &::before {
      transition-duration: 0.001ms;
    }
  }
`

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  { label, id, indeterminate, className, style, ...rest },
  ref,
) {
  const generatedId = useId()
  const inputId = id ?? generatedId

  return (
    <Row htmlFor={inputId} className={className} style={style}>
      <Box
        ref={(node) => {
          if (node) node.indeterminate = Boolean(indeterminate)
          if (typeof ref === 'function') ref(node)
          else if (ref) ref.current = node
        }}
        type="checkbox"
        id={inputId}
        aria-checked={indeterminate ? 'mixed' : undefined}
        {...rest}
      />
      {label}
    </Row>
  )
})

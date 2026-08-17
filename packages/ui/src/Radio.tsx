import { forwardRef, useId } from 'react'
import type { InputHTMLAttributes, ReactNode } from 'react'
import styled from 'styled-components'
import { focusRing } from './internal/mixins'

export interface RadioProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: ReactNode
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

const Dot = styled.input`
  appearance: none;
  flex-shrink: 0;
  width: 1.15rem;
  height: 1.15rem;
  margin: 0;
  border: 1px solid var(--foot-color-border);
  border-radius: 999px;
  background: var(--foot-color-surface);
  cursor: pointer;
  display: inline-grid;
  place-content: center;
  transition:
    background-color 0.2s ease,
    border-color 0.2s ease;

  &::before {
    content: '';
    width: 0.55rem;
    height: 0.55rem;
    border-radius: 999px;
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

export const Radio = forwardRef<HTMLInputElement, RadioProps>(function Radio(
  { label, id, className, style, ...rest },
  ref,
) {
  const generatedId = useId()
  const inputId = id ?? generatedId

  return (
    <Row htmlFor={inputId} className={className} style={style}>
      <Dot ref={ref} type="radio" id={inputId} {...rest} />
      {label}
    </Row>
  )
})

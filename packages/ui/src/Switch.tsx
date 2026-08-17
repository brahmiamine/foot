import { forwardRef, useId } from 'react'
import type { InputHTMLAttributes, ReactNode } from 'react'
import styled from 'styled-components'
import { focusRing } from './internal/mixins'

export interface SwitchProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: ReactNode
}

const Row = styled.label`
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
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

const Track = styled.input`
  appearance: none;
  flex-shrink: 0;
  position: relative;
  width: 2.5rem;
  height: 1.5rem;
  margin: 0;
  border: 1px solid var(--foot-color-border);
  border-radius: 999px;
  background: var(--foot-color-border);
  cursor: pointer;
  transition: background-color 0.2s ease, border-color 0.2s ease;

  &::before {
    content: '';
    position: absolute;
    inset-block-start: 1px;
    inset-inline-start: 1px;
    width: 1.2rem;
    height: 1.2rem;
    border-radius: 999px;
    background: #fff;
    box-shadow: 0 1px 2px rgba(11, 31, 46, 0.25);
    transition: inset-inline-start 0.15s ease;
  }

  &:checked {
    background: var(--foot-color-primary);
    border-color: var(--foot-color-primary);
  }

  &:checked::before {
    inset-inline-start: calc(100% - 1.2rem - 1px);
  }

  &:disabled {
    cursor: not-allowed;
  }

  ${focusRing}

  @media (max-width: 640px) {
    width: 2.75rem;
    height: 1.65rem;

    &::before {
      width: 1.35rem;
      height: 1.35rem;
    }

    &:checked::before {
      inset-inline-start: calc(100% - 1.35rem - 1px);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    transition-duration: 0.001ms;

    &::before {
      transition-duration: 0.001ms;
    }
  }
`

export const Switch = forwardRef<HTMLInputElement, SwitchProps>(function Switch(
  { label, id, className, style, ...rest },
  ref,
) {
  const generatedId = useId()
  const inputId = id ?? generatedId

  return (
    <Row htmlFor={inputId} className={className} style={style}>
      <Track ref={ref} type="checkbox" role="switch" id={inputId} {...rest} />
      {label}
    </Row>
  )
})

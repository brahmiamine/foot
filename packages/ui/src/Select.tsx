import { forwardRef } from 'react'
import type { ReactNode, SelectHTMLAttributes } from 'react'
import styled, { css } from 'styled-components'
import { inputBaseStyles } from './Input'

export interface SelectOption {
  value: string
  label: string
  disabled?: boolean
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean
  options?: SelectOption[]
  /** Custom children take priority over `options` when provided. */
  children?: ReactNode
}

const Wrapper = styled.div`
  position: relative;
  min-width: 0;
  max-width: 100%;
`

const StyledSelect = styled.select<{ $invalid: boolean }>`
  ${inputBaseStyles}
  appearance: none;
  padding-inline-end: 2.25rem;
  background-image: linear-gradient(45deg, transparent 50%, var(--foot-color-text-muted) 50%),
    linear-gradient(135deg, var(--foot-color-text-muted) 50%, transparent 50%);
  background-position:
    calc(100% - 1.15rem) center,
    calc(100% - 0.85rem) center;
  background-size:
    6px 6px,
    6px 6px;
  background-repeat: no-repeat;

  html[dir='rtl'] & {
    background-position:
      1.15rem center,
      0.85rem center;
    padding-inline-end: 0.75rem;
    padding-inline-start: 2.25rem;
  }

  ${(p) =>
    p.$invalid &&
    css`
      border-color: var(--foot-color-danger);
    `}
`

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { invalid = false, options, children, 'aria-invalid': ariaInvalid, ...rest },
  ref,
) {
  return (
    <Wrapper>
      <StyledSelect
        ref={ref}
        $invalid={invalid}
        aria-invalid={ariaInvalid ?? (invalid || undefined)}
        {...rest}
      >
        {children ??
          options?.map((option) => (
            <option key={option.value} value={option.value} disabled={option.disabled}>
              {option.label}
            </option>
          ))}
      </StyledSelect>
    </Wrapper>
  )
})

import { forwardRef } from 'react'
import type { TextareaHTMLAttributes } from 'react'
import styled, { css } from 'styled-components'
import { inputBaseStyles } from './Input'

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean
}

const StyledTextarea = styled.textarea<{ $invalid: boolean }>`
  ${inputBaseStyles}
  min-height: 6rem;
  resize: vertical;

  ${(p) =>
    p.$invalid &&
    css`
      border-color: var(--foot-color-danger);
    `}
`

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { invalid = false, 'aria-invalid': ariaInvalid, ...rest },
  ref,
) {
  return (
    <StyledTextarea
      ref={ref}
      $invalid={invalid}
      aria-invalid={ariaInvalid ?? (invalid || undefined)}
      {...rest}
    />
  )
})

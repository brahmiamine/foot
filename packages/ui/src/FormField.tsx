import { Children, cloneElement, isValidElement, useId } from 'react'
import type { ReactElement, ReactNode } from 'react'
import styled from 'styled-components'

export interface FormFieldProps {
  label?: ReactNode
  /** Helper text shown when there is no error. */
  helperText?: ReactNode
  /** Error text; when present it replaces `helperText` and marks the field invalid. */
  errorText?: ReactNode
  required?: boolean
  /** A single form control element (Input, Textarea, Select, ...). It receives `id`,
   * `aria-describedby` and `aria-invalid`/`invalid` automatically. */
  children: ReactNode
  className?: string
  htmlFor?: string
}

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  min-width: 0;
  max-width: 100%;
`

const Label = styled.label`
  font-family: var(--foot-font-ui);
  font-size: 0.8125rem;
  font-weight: 700;
  color: var(--foot-color-text);
`

const RequiredMark = styled.span`
  color: var(--foot-color-danger);
  margin-inline-start: 0.15rem;
`

const HelperText = styled.p`
  margin: 0;
  font-family: var(--foot-font-ui);
  font-size: 0.75rem;
  color: var(--foot-color-text-muted);
`

const ErrorText = styled.p`
  margin: 0;
  font-family: var(--foot-font-ui);
  font-size: 0.75rem;
  color: var(--foot-color-danger);
  font-weight: 600;
`

export function FormField({
  label,
  helperText,
  errorText,
  required,
  children,
  className,
  htmlFor,
}: FormFieldProps) {
  const generatedId = useId()
  const fieldId = htmlFor ?? generatedId
  const helperId = `${fieldId}-helper`
  const errorId = `${fieldId}-error`
  const describedBy = errorText ? errorId : helperText ? helperId : undefined

  const child = Children.only(children)
  const control = isValidElement(child)
    ? cloneElement(child as ReactElement<Record<string, unknown>>, {
        id: (child.props as Record<string, unknown>).id ?? fieldId,
        'aria-describedby':
          [(child.props as Record<string, unknown>)['aria-describedby'], describedBy]
            .filter(Boolean)
            .join(' ') || undefined,
        'aria-invalid': Boolean(errorText) || undefined,
        invalid: Boolean(errorText) || (child.props as Record<string, unknown>).invalid,
      })
    : child

  return (
    <Wrapper className={className}>
      {label && (
        <Label htmlFor={fieldId}>
          {label}
          {required && <RequiredMark aria-hidden="true"> *</RequiredMark>}
        </Label>
      )}
      {control}
      {errorText ? (
        <ErrorText id={errorId} role="alert">
          {errorText}
        </ErrorText>
      ) : (
        helperText && <HelperText id={helperId}>{helperText}</HelperText>
      )}
    </Wrapper>
  )
}

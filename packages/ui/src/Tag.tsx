import type { HTMLAttributes } from 'react'
import styled from 'styled-components'
import { focusRing } from './internal/mixins'

export interface TagProps extends HTMLAttributes<HTMLSpanElement> {
  onRemove?: () => void
  removeLabel?: string
  disabled?: boolean
}

const StyledTag = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  width: fit-content;
  max-width: 100%;
  padding: 0.25rem 0.6rem;
  border: 1px solid var(--foot-color-border);
  border-radius: 999px;
  background: var(--foot-color-background);
  color: var(--foot-color-text);
  font-family: var(--foot-font-ui);
  font-size: 0.8125rem;
  font-weight: 600;
  overflow-wrap: anywhere;
`

const RemoveButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 1.1rem;
  height: 1.1rem;
  margin-inline-end: -0.2rem;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: var(--foot-color-text-muted);
  font-size: 0.9rem;
  line-height: 1;
  cursor: pointer;

  &:hover:not(:disabled) {
    background: var(--foot-color-border);
    color: var(--foot-color-text);
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }

  ${focusRing}
`

export function Tag({ children, onRemove, removeLabel = 'Retirer', disabled, ...rest }: TagProps) {
  return (
    <StyledTag {...rest}>
      {children}
      {onRemove && (
        <RemoveButton type="button" aria-label={removeLabel} onClick={onRemove} disabled={disabled}>
          ×
        </RemoveButton>
      )}
    </StyledTag>
  )
}

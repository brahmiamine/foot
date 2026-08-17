import { forwardRef } from 'react'
import type { InputHTMLAttributes } from 'react'
import styled from 'styled-components'
import { inputBaseStyles } from './Input'
import { focusRing } from './internal/mixins'

export interface SearchInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  onClear?: () => void
}

const Wrapper = styled.div`
  position: relative;
  min-width: 0;
  max-width: 100%;
  display: flex;
  align-items: center;
`

const SearchIcon = styled.svg`
  position: absolute;
  inset-inline-start: 0.7rem;
  width: 1rem;
  height: 1rem;
  color: var(--foot-color-text-muted);
  pointer-events: none;
`

const StyledInput = styled.input`
  ${inputBaseStyles}
  padding-inline-start: 2.15rem;
`

const ClearButton = styled.button`
  position: absolute;
  inset-inline-end: 0.4rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.5rem;
  height: 1.5rem;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: var(--foot-color-text-muted);
  cursor: pointer;

  &:hover {
    background: var(--foot-color-border);
  }

  ${focusRing}
`

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(function SearchInput(
  { onClear, value, ...rest },
  ref,
) {
  const hasValue = typeof value === 'string' && value.length > 0

  return (
    <Wrapper>
      <SearchIcon viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <circle cx="11" cy="11" r="7" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </SearchIcon>
      <StyledInput ref={ref} type="search" value={value} role="searchbox" {...rest} />
      {onClear && hasValue && (
        <ClearButton type="button" aria-label="Effacer la recherche" onClick={onClear}>
          ×
        </ClearButton>
      )}
    </Wrapper>
  )
})

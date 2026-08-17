import { useId, useRef, useState } from 'react'
import type { KeyboardEvent, ReactNode } from 'react'
import styled from 'styled-components'
import { focusRing } from './internal/mixins'

export interface TabItem {
  value: string
  label: ReactNode
  disabled?: boolean
  panel: ReactNode
}

export interface TabsProps {
  items: TabItem[]
  value?: string
  defaultValue?: string
  onChange?: (value: string) => void
  className?: string
}

const TabList = styled.div`
  display: flex;
  flex-wrap: wrap;
  min-width: 0;
  max-width: 100%;
  gap: 0.25rem;
  border-block-end: 1px solid var(--foot-color-border);
`

const TabButton = styled.button<{ $active: boolean }>`
  appearance: none;
  border: 0;
  border-block-end: 2px solid ${(p) => (p.$active ? 'var(--foot-color-primary)' : 'transparent')};
  background: transparent;
  padding: 0.65rem 0.9rem;
  margin-block-end: -1px;
  font-family: var(--foot-font-ui);
  font-size: 0.875rem;
  font-weight: 700;
  color: ${(p) => (p.$active ? 'var(--foot-color-primary)' : 'var(--foot-color-text-muted)')};
  cursor: pointer;
  transition:
    color 0.15s ease,
    border-color 0.15s ease;

  &:hover:not(:disabled) {
    color: var(--foot-color-text);
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }

  ${focusRing}

  @media (max-width: 640px) {
    min-height: var(--foot-touch-target);
  }

  @media (prefers-reduced-motion: reduce) {
    transition-duration: 0.001ms;
  }
`

const Panel = styled.div`
  padding-block-start: 1rem;
  min-width: 0;
  max-width: 100%;
`

export function Tabs({ items, value, defaultValue, onChange, className }: TabsProps) {
  const [internalValue, setInternalValue] = useState(defaultValue ?? items[0]?.value)
  const activeValue = value ?? internalValue
  const refs = useRef<Record<string, HTMLButtonElement | null>>({})
  const baseId = useId()

  function select(next: string) {
    if (value === undefined) setInternalValue(next)
    onChange?.(next)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const enabled = items.filter((item) => !item.disabled)
    const currentIndex = enabled.findIndex((item) => item.value === activeValue)
    if (currentIndex === -1) return

    let nextIndex: number | null = null
    if (event.key === 'ArrowRight') nextIndex = (currentIndex + 1) % enabled.length
    else if (event.key === 'ArrowLeft') nextIndex = (currentIndex - 1 + enabled.length) % enabled.length
    else if (event.key === 'Home') nextIndex = 0
    else if (event.key === 'End') nextIndex = enabled.length - 1

    if (nextIndex !== null) {
      event.preventDefault()
      const next = enabled[nextIndex]
      select(next.value)
      refs.current[next.value]?.focus()
    }
  }

  const active = items.find((item) => item.value === activeValue)

  return (
    <div className={className}>
      <TabList role="tablist" onKeyDown={handleKeyDown}>
        {items.map((item) => {
          const isActive = item.value === activeValue
          return (
            <TabButton
              key={item.value}
              ref={(node) => {
                refs.current[item.value] = node
              }}
              role="tab"
              id={`${baseId}-tab-${item.value}`}
              aria-selected={isActive}
              aria-controls={`${baseId}-panel-${item.value}`}
              tabIndex={isActive ? 0 : -1}
              disabled={item.disabled}
              $active={isActive}
              onClick={() => select(item.value)}
            >
              {item.label}
            </TabButton>
          )
        })}
      </TabList>
      {active && (
        <Panel role="tabpanel" id={`${baseId}-panel-${active.value}`} aria-labelledby={`${baseId}-tab-${active.value}`} tabIndex={0}>
          {active.panel}
        </Panel>
      )}
    </div>
  )
}

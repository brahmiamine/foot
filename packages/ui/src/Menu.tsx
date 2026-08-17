import { cloneElement, useId, useRef, useState } from 'react'
import type { KeyboardEvent, ReactElement, ReactNode } from 'react'
import styled from 'styled-components'
import { focusRing } from './internal/mixins'
import { useEscapeKey, useOutsideClick } from './internal/hooks'

export interface MenuItem {
  value: string
  label: ReactNode
  disabled?: boolean
  onSelect?: () => void
}

export interface MenuProps {
  items: MenuItem[]
  /** The trigger element; a click handler and ARIA attributes are injected onto it. */
  trigger: ReactElement<Record<string, unknown>>
  align?: 'start' | 'end'
  className?: string
}

const Wrapper = styled.div`
  position: relative;
  display: inline-block;
  min-width: 0;
`

const MenuList = styled.ul<{ $align: 'start' | 'end' }>`
  position: absolute;
  inset-block-start: calc(100% + 0.35rem);
  inset-inline-${(p) => (p.$align === 'start' ? 'start' : 'end')}: 0;
  z-index: 1000;
  min-width: 12rem;
  max-width: min(20rem, 90vw);
  margin: 0;
  padding: 0.35rem;
  list-style: none;
  border: 1px solid var(--foot-color-border);
  border-radius: var(--foot-radius-md);
  background: var(--foot-color-surface);
  box-shadow: var(--foot-shadow-card-hover);
`

const MenuButton = styled.button`
  display: block;
  width: 100%;
  padding: 0.55rem 0.7rem;
  border: 0;
  border-radius: var(--foot-radius-sm);
  background: transparent;
  color: var(--foot-color-text);
  font-family: var(--foot-font-ui);
  font-size: 0.875rem;
  text-align: start;
  cursor: pointer;

  &:hover:not(:disabled),
  &[data-focused='true'] {
    background: var(--foot-color-background);
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }

  ${focusRing}
`

export function Menu({ items, trigger, align = 'start', className }: MenuProps) {
  const [open, setOpen] = useState(false)
  const [focusedIndex, setFocusedIndex] = useState(0)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([])
  const menuId = useId()

  function close() {
    setOpen(false)
  }

  useEscapeKey(open, close)
  useOutsideClick(open, [wrapperRef], close)

  function openMenu() {
    setOpen(true)
    setFocusedIndex(0)
    requestAnimationFrame(() => itemRefs.current[0]?.focus())
  }

  function handleTriggerKeyDown(event: KeyboardEvent) {
    if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      openMenu()
    }
  }

  function handleMenuKeyDown(event: KeyboardEvent<HTMLUListElement>) {
    const enabledIndexes = items.map((item, i) => (!item.disabled ? i : -1)).filter((i) => i >= 0)
    const pos = enabledIndexes.indexOf(focusedIndex)

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      const next = enabledIndexes[(pos + 1) % enabledIndexes.length]
      setFocusedIndex(next)
      itemRefs.current[next]?.focus()
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      const next = enabledIndexes[(pos - 1 + enabledIndexes.length) % enabledIndexes.length]
      setFocusedIndex(next)
      itemRefs.current[next]?.focus()
    } else if (event.key === 'Home') {
      event.preventDefault()
      setFocusedIndex(enabledIndexes[0])
      itemRefs.current[enabledIndexes[0]]?.focus()
    } else if (event.key === 'End') {
      event.preventDefault()
      const last = enabledIndexes[enabledIndexes.length - 1]
      setFocusedIndex(last)
      itemRefs.current[last]?.focus()
    } else if (event.key === 'Tab') {
      close()
    }
  }

  const triggerProps = {
    'aria-haspopup': 'menu' as const,
    'aria-expanded': open,
    'aria-controls': menuId,
    onClick: () => (open ? close() : openMenu()),
    onKeyDown: handleTriggerKeyDown,
  }

  return (
    <Wrapper ref={wrapperRef} className={className}>
      {trigger && cloneElement(trigger, triggerProps)}
      {open && (
        <MenuList id={menuId} role="menu" $align={align} onKeyDown={handleMenuKeyDown}>
          {items.map((item, index) => (
            <li key={item.value} role="none">
              <MenuButton
                ref={(node) => {
                  itemRefs.current[index] = node
                }}
                role="menuitem"
                type="button"
                disabled={item.disabled}
                data-focused={focusedIndex === index}
                tabIndex={-1}
                onClick={() => {
                  item.onSelect?.()
                  close()
                }}
              >
                {item.label}
              </MenuButton>
            </li>
          ))}
        </MenuList>
      )}
    </Wrapper>
  )
}

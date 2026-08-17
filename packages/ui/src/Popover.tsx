import { cloneElement, useId, useRef, useState } from 'react'
import type { MouseEvent, ReactElement, ReactNode } from 'react'
import styled from 'styled-components'
import { useEscapeKey, useOutsideClick } from './internal/hooks'

export interface PopoverProps {
  content: ReactNode
  trigger: ReactElement<Record<string, unknown>>
  align?: 'start' | 'end'
  className?: string
}

const Wrapper = styled.div`
  position: relative;
  display: inline-block;
  min-width: 0;
`

const Bubble = styled.div<{ $align: 'start' | 'end' }>`
  position: absolute;
  inset-block-start: calc(100% + 0.5rem);
  inset-inline-${(p) => (p.$align === 'start' ? 'start' : 'end')}: 0;
  z-index: 1060;
  min-width: 14rem;
  max-width: min(22rem, 90vw);
  padding: 0.85rem;
  border: 1px solid var(--foot-color-border);
  border-radius: var(--foot-radius-md);
  background: var(--foot-color-surface);
  color: var(--foot-color-text);
  box-shadow: var(--foot-shadow-card-hover);
  font-family: var(--foot-font-ui);
  font-size: 0.875rem;
`

export function Popover({ content, trigger, align = 'start', className }: PopoverProps) {
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const popoverId = useId()

  function close() {
    setOpen(false)
  }

  useEscapeKey(open, close)
  useOutsideClick(open, [wrapperRef], close)

  const triggerElement = cloneElement(trigger, {
    'aria-haspopup': 'dialog' as const,
    'aria-expanded': open,
    'aria-controls': popoverId,
    onClick: (event: MouseEvent) => {
      ;(trigger.props.onClick as ((e: MouseEvent) => void) | undefined)?.(event)
      setOpen((prev) => !prev)
    },
  })

  return (
    <Wrapper ref={wrapperRef} className={className}>
      {triggerElement}
      {open && (
        <Bubble id={popoverId} role="dialog" $align={align}>
          {content}
        </Bubble>
      )}
    </Wrapper>
  )
}

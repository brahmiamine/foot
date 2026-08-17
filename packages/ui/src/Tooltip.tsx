import { cloneElement, isValidElement, useId, useRef, useState } from 'react'
import type { FocusEvent, MouseEvent, ReactElement, ReactNode } from 'react'
import { createPortal } from 'react-dom'
import styled from 'styled-components'
import { useEscapeKey } from './internal/hooks'

export type TooltipPlacement = 'top' | 'bottom' | 'left' | 'right'

export interface TooltipProps {
  content: ReactNode
  children: ReactElement<Record<string, unknown>>
  placement?: TooltipPlacement
  /** Delay in ms before showing, to avoid flicker on quick mouse passes. */
  delay?: number
}

const Bubble = styled.div<{ $x: number; $y: number; $placement: TooltipPlacement }>`
  position: fixed;
  z-index: 1080;
  inset-inline-start: ${(p) => p.$x}px;
  inset-block-start: ${(p) => p.$y}px;
  max-width: 16rem;
  padding: 0.4rem 0.6rem;
  border-radius: var(--foot-radius-sm);
  background: var(--foot-color-dark);
  color: #fff;
  font-family: var(--foot-font-ui);
  font-size: 0.75rem;
  line-height: 1.4;
  box-shadow: var(--foot-shadow-card);
  pointer-events: none;
  overflow-wrap: anywhere;
`

function computePosition(rect: DOMRect, placement: TooltipPlacement) {
  const gap = 8
  switch (placement) {
    case 'top':
      return { x: rect.left + rect.width / 2, y: rect.top - gap }
    case 'bottom':
      return { x: rect.left + rect.width / 2, y: rect.bottom + gap }
    case 'left':
      return { x: rect.left - gap, y: rect.top + rect.height / 2 }
    case 'right':
      return { x: rect.right + gap, y: rect.top + rect.height / 2 }
  }
}

const placementTransform: Record<TooltipPlacement, string> = {
  top: 'translate(-50%, -100%)',
  bottom: 'translate(-50%, 0)',
  left: 'translate(-100%, -50%)',
  right: 'translate(0, -50%)',
}

export function Tooltip({ content, children, placement = 'top', delay = 150 }: TooltipProps) {
  const [open, setOpen] = useState(false)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const triggerRef = useRef<HTMLElement | null>(null)
  const tooltipId = useId()

  useEscapeKey(open, () => setOpen(false))

  function show() {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      const rect = triggerRef.current?.getBoundingClientRect()
      if (rect) setPosition(computePosition(rect, placement))
      setOpen(true)
    }, delay)
  }

  function hide() {
    if (timerRef.current) clearTimeout(timerRef.current)
    setOpen(false)
  }

  if (!isValidElement(children)) return children

  const child = cloneElement(children, {
    ref: (node: HTMLElement | null) => {
      triggerRef.current = node
      const childRef = (children as unknown as { ref?: unknown }).ref
      if (typeof childRef === 'function') childRef(node)
      else if (childRef && typeof childRef === 'object') (childRef as { current: unknown }).current = node
    },
    'aria-describedby': open ? tooltipId : undefined,
    onMouseEnter: (event: MouseEvent) => {
      ;(children.props.onMouseEnter as ((e: MouseEvent) => void) | undefined)?.(event)
      show()
    },
    onMouseLeave: (event: MouseEvent) => {
      ;(children.props.onMouseLeave as ((e: MouseEvent) => void) | undefined)?.(event)
      hide()
    },
    onFocus: (event: FocusEvent) => {
      ;(children.props.onFocus as ((e: FocusEvent) => void) | undefined)?.(event)
      show()
    },
    onBlur: (event: FocusEvent) => {
      ;(children.props.onBlur as ((e: FocusEvent) => void) | undefined)?.(event)
      hide()
    },
  })

  return (
    <>
      {child}
      {open &&
        typeof document !== 'undefined' &&
        createPortal(
          <Bubble
            id={tooltipId}
            role="tooltip"
            $x={position.x}
            $y={position.y}
            $placement={placement}
            style={{ transform: placementTransform[placement] }}
          >
            {content}
          </Bubble>,
          document.body,
        )}
    </>
  )
}

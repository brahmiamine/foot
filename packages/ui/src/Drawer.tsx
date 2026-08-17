import { useId, useRef } from 'react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import styled, { keyframes } from 'styled-components'
import { IconButton } from './IconButton'
import { useBodyScrollLock, useEscapeKey, useFocusTrap } from './internal/hooks'

export interface DrawerProps {
  open: boolean
  onClose: () => void
  title?: ReactNode
  children?: ReactNode
  /** Which edge the drawer slides in from. Respects RTL via logical placement. */
  placement?: 'start' | 'end' | 'bottom'
  size?: string
}

const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 1040;
  background: rgba(13, 13, 13, 0.5);
  animation: ${fadeIn} 0.15s ease;

  @media (prefers-reduced-motion: reduce) {
    animation-duration: 0.001ms;
  }
`

const slideStart = keyframes`
  from { transform: translateX(-100%); }
  to { transform: translateX(0); }
`
const slideEnd = keyframes`
  from { transform: translateX(100%); }
  to { transform: translateX(0); }
`
const slideBottom = keyframes`
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
`

const placementAnimation = {
  start: slideStart,
  end: slideEnd,
  bottom: slideBottom,
}

const Panel = styled.div<{ $placement: 'start' | 'end' | 'bottom'; $size: string }>`
  position: fixed;
  z-index: 1041;
  display: flex;
  flex-direction: column;
  background: var(--foot-color-surface);
  color: var(--foot-color-text);
  box-shadow: var(--foot-shadow-card-hover);
  min-width: 0;

  ${(p) =>
    p.$placement === 'bottom'
      ? `
        inset-inline: 0;
        inset-block-end: 0;
        max-height: ${p.$size};
        border-start-start-radius: var(--foot-radius-lg);
        border-start-end-radius: var(--foot-radius-lg);
      `
      : `
        inset-block: 0;
        inset-inline-${p.$placement}: 0;
        width: min(${p.$size}, 100vw);
      `}

  animation: ${(p) => placementAnimation[p.$placement]} 0.22s ease;

  @media (prefers-reduced-motion: reduce) {
    animation-duration: 0.001ms;
  }
`

const Header = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  padding: 1.25rem 1.25rem 0.75rem;
`

const Title = styled.h2`
  margin: 0;
  font-family: var(--foot-font-ui);
  font-size: 1.125rem;
  font-weight: 800;
  overflow-wrap: anywhere;
`

const Body = styled.div`
  padding: 0 1.25rem 1.25rem;
  overflow-y: auto;
  min-width: 0;
  flex: 1;
`

export function Drawer({ open, onClose, title, children, placement = 'end', size = '24rem' }: DrawerProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const titleId = useId()

  useEscapeKey(open, onClose)
  useFocusTrap(open, panelRef)
  useBodyScrollLock(open)

  if (!open || typeof document === 'undefined') return null

  return createPortal(
    <>
      <Overlay onMouseDown={onClose} />
      <Panel
        ref={panelRef}
        $placement={placement}
        $size={size}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        tabIndex={-1}
      >
        {title && (
          <Header>
            <Title id={titleId}>{title}</Title>
            <IconButton
              aria-label="Fermer"
              size="sm"
              variant="ghost"
              icon={<span aria-hidden="true">×</span>}
              onClick={onClose}
            />
          </Header>
        )}
        <Body>{children}</Body>
      </Panel>
    </>,
    document.body,
  )
}

import { useId, useRef } from 'react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import styled, { keyframes } from 'styled-components'
import { IconButton } from './IconButton'
import { useBodyScrollLock, useEscapeKey, useFocusTrap } from './internal/hooks'

export interface ModalProps {
  open: boolean
  onClose: () => void
  title?: ReactNode
  children?: ReactNode
  footer?: ReactNode
  size?: 'sm' | 'md' | 'lg'
  closeOnOverlayClick?: boolean
}

const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`

const scaleIn = keyframes`
  from { opacity: 0; transform: translateY(0.75rem) scale(0.98); }
  to { opacity: 1; transform: translateY(0) scale(1); }
`

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 1050;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  background: rgba(13, 13, 13, 0.5);
  animation: ${fadeIn} 0.15s ease;

  @media (prefers-reduced-motion: reduce) {
    animation-duration: 0.001ms;
  }
`

const sizeWidth = {
  sm: '24rem',
  md: '32rem',
  lg: '48rem',
}

const Panel = styled.div<{ $size: 'sm' | 'md' | 'lg' }>`
  width: 100%;
  max-width: ${(p) => sizeWidth[p.$size]};
  max-height: calc(100vh - 2rem);
  display: flex;
  flex-direction: column;
  min-width: 0;
  border-radius: var(--foot-radius-lg);
  background: var(--foot-color-surface);
  color: var(--foot-color-text);
  box-shadow: var(--foot-shadow-card-hover);
  animation: ${scaleIn} 0.18s ease;

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
  color: var(--foot-color-text);
  overflow-wrap: anywhere;
`

const Body = styled.div`
  padding: 0 1.25rem 1.25rem;
  overflow-y: auto;
  min-width: 0;
`

const Footer = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 0.5rem;
  padding: 0.75rem 1.25rem 1.25rem;
`

export function Modal({ open, onClose, title, children, footer, size = 'md', closeOnOverlayClick = true }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const titleId = useId()

  useEscapeKey(open, onClose)
  useFocusTrap(open, panelRef)
  useBodyScrollLock(open)

  if (!open || typeof document === 'undefined') return null

  return createPortal(
    <Overlay
      onMouseDown={(event) => {
        if (closeOnOverlayClick && event.target === event.currentTarget) onClose()
      }}
    >
      <Panel
        ref={panelRef}
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
        {footer && <Footer>{footer}</Footer>}
      </Panel>
    </Overlay>,
    document.body,
  )
}

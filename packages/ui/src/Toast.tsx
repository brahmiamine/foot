import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import styled, { keyframes } from 'styled-components'

export type ToastVariant = 'neutral' | 'success' | 'warning' | 'danger' | 'info'

export interface ToastOptions {
  title: ReactNode
  description?: ReactNode
  variant?: ToastVariant
  /** Milliseconds before auto-dismiss. Pass 0 to require manual dismissal. */
  duration?: number
}

export interface ToastItem extends ToastOptions {
  id: string
}

interface ToastContextValue {
  toast: (options: ToastOptions) => string
  dismiss: (id: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const variantAccent: Record<ToastVariant, string> = {
  neutral: 'var(--foot-color-secondary)',
  success: 'var(--foot-color-success)',
  warning: 'var(--foot-color-warning)',
  danger: 'var(--foot-color-danger)',
  info: 'var(--foot-color-info)',
}

const slideIn = keyframes`
  from {
    opacity: 0;
    transform: translateY(-0.5rem);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`

const Viewport = styled.div`
  position: fixed;
  inset-block-start: 1rem;
  inset-inline-end: 1rem;
  z-index: 1070;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  width: min(24rem, calc(100vw - 2rem));
  max-width: 100%;

  @media (max-width: 640px) {
    inset-inline: 0.75rem;
    width: auto;
  }
`

const ToastCard = styled.div<{ $variant: ToastVariant }>`
  display: flex;
  align-items: flex-start;
  gap: 0.65rem;
  min-width: 0;
  padding: 0.85rem 1rem;
  border: 1px solid var(--foot-color-border);
  border-inline-start: 3px solid ${(p) => variantAccent[p.$variant]};
  border-radius: var(--foot-radius-md);
  background: var(--foot-color-surface);
  color: var(--foot-color-text);
  box-shadow: var(--foot-shadow-card);
  font-family: var(--foot-font-ui);
  animation: ${slideIn} 0.2s ease;

  @media (prefers-reduced-motion: reduce) {
    animation-duration: 0.001ms;
  }
`

const ToastBody = styled.div`
  flex: 1;
  min-width: 0;
`

const ToastTitle = styled.p`
  margin: 0;
  font-weight: 700;
  font-size: 0.875rem;
  overflow-wrap: anywhere;
`

const ToastDescription = styled.p`
  margin: 0.15rem 0 0;
  font-size: 0.8125rem;
  color: var(--foot-color-text-muted);
  overflow-wrap: anywhere;
`

const CloseButton = styled.button`
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.5rem;
  height: 1.5rem;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: var(--foot-color-text-muted);
  font-size: 1rem;
  line-height: 1;
  cursor: pointer;

  &:hover {
    background: var(--foot-color-border);
  }

  &:focus-visible {
    outline: 2px solid var(--foot-color-primary);
    outline-offset: 2px;
  }
`

export interface ToastProviderProps {
  children?: ReactNode
  /** Default auto-dismiss duration in ms. Defaults to 5000; pass 0 to disable. */
  defaultDuration?: number
}

export function ToastProvider({ children, defaultDuration = 5000 }: ToastProviderProps) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>())

  const dismiss = useCallback((id: string) => {
    setToasts((current) => current.filter((item) => item.id !== id))
    const timer = timers.current.get(id)
    if (timer) {
      clearTimeout(timer)
      timers.current.delete(id)
    }
  }, [])

  const toast = useCallback(
    (options: ToastOptions) => {
      const id = `toast-${Math.random().toString(36).slice(2, 10)}`
      const item: ToastItem = { id, variant: 'neutral', ...options }
      setToasts((current) => [...current, item])

      const duration = options.duration ?? defaultDuration
      if (duration > 0) {
        const timer = setTimeout(() => dismiss(id), duration)
        timers.current.set(id, timer)
      }
      return id
    },
    [defaultDuration, dismiss],
  )

  const value = useMemo(() => ({ toast, dismiss }), [toast, dismiss])
  const canPortal = typeof document !== 'undefined'

  return (
    <ToastContext.Provider value={value}>
      {children}
      {canPortal &&
        createPortal(
          <Viewport aria-live="polite" aria-label="Notifications">
            {toasts.map((item) => (
              <ToastCard key={item.id} $variant={item.variant ?? 'neutral'} role="status">
                <ToastBody>
                  <ToastTitle>{item.title}</ToastTitle>
                  {item.description && <ToastDescription>{item.description}</ToastDescription>}
                </ToastBody>
                <CloseButton type="button" aria-label="Fermer" onClick={() => dismiss(item.id)}>
                  ×
                </CloseButton>
              </ToastCard>
            ))}
          </Viewport>,
          document.body,
        )}
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a <ToastProvider>')
  }
  return context
}

// Re-export so consumers can theme/extend a bespoke variant map if needed.
export const toastVariantAccent = variantAccent

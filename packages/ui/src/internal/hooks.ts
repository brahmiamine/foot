import { useEffect, useRef } from 'react'

/** Focusable-selector used by the focus trap and roving-tabindex helpers. */
const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

export function getFocusable(container: HTMLElement): HTMLElement[] {
  // Note: deliberately not filtering on `offsetParent`/layout visibility —
  // jsdom (used in tests) never computes layout, so `offsetParent` is
  // always null there. Elements are already excluded via `:not([hidden])`-
  // equivalent semantics through `disabled`/`tabindex="-1"` in the selector;
  // authors are expected to not render hidden-but-focusable elements inside
  // an open dialog.
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
}

/**
 * Runs `onClose` when Escape is pressed while `active` is true. Used by
 * Modal, Drawer, Popover, Menu and Tooltip.
 */
export function useEscapeKey(active: boolean, onClose: () => void) {
  useEffect(() => {
    if (!active) return
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [active, onClose])
}

/** Calls `onOutside` for pointer events that land outside every given ref. */
export function useOutsideClick(
  active: boolean,
  refs: Array<React.RefObject<HTMLElement | null>>,
  onOutside: () => void,
) {
  useEffect(() => {
    if (!active) return
    function handlePointerDown(event: MouseEvent | TouchEvent) {
      const target = event.target as Node
      const isInside = refs.some((ref) => ref.current && ref.current.contains(target))
      if (!isInside) onOutside()
    }
    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('touchstart', handlePointerDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('touchstart', handlePointerDown)
    }
  }, [active, refs, onOutside])
}

/**
 * Traps Tab/Shift+Tab focus cycling within `containerRef` while `active`,
 * moves initial focus into the container, and restores focus to whatever was
 * focused before opening once `active` goes back to false.
 */
export function useFocusTrap(active: boolean, containerRef: React.RefObject<HTMLElement | null>) {
  const previouslyFocused = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!active) return

    previouslyFocused.current = document.activeElement as HTMLElement | null
    const container = containerRef.current
    if (container) {
      const focusable = getFocusable(container)
      ;(focusable[0] ?? container).focus()
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Tab' || !container) return
      const focusable = getFocusable(container)
      if (focusable.length === 0) {
        event.preventDefault()
        return
      }
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      previouslyFocused.current?.focus?.()
    }
  }, [active, containerRef])
}

/** Locks `document.body` scrolling while `active` is true (Modal/Drawer). */
export function useBodyScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return
    const original = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = original
    }
  }, [active])
}

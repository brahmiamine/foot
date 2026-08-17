import type { CSSProperties } from 'react'
import { css } from 'styled-components'

/**
 * Shared low-level CSS fragments reused by every component so the
 * accessibility/RTL/reduced-motion contract stays consistent instead of
 * being re-derived file by file.
 */

export const focusRing = css`
  &:focus-visible {
    outline: 2px solid var(--foot-color-primary);
    outline-offset: 2px;
  }
`

export const reducedMotion = (rules: ReturnType<typeof css>) => css`
  @media (prefers-reduced-motion: reduce) {
    ${rules}
  }
`

export const noTapHighlight = css`
  -webkit-tap-highlight-color: transparent;
`

export const visuallyHidden = css`
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
`

export const screenReaderOnlyStyle: CSSProperties = {
  position: 'absolute',
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  border: 0,
}

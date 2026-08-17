import { createGlobalStyle } from 'styled-components'

/**
 * Optional convenience: centralizes the handful of cross-cutting rules every
 * FOOT surface should have (visible keyboard focus, reduced-motion respect).
 * Components in this package already carry their own focus-visible and
 * reduced-motion rules locally, so mounting `FootGlobalStyle` is not
 * required — it just saves a consuming app from redeclaring the same
 * baseline that `packages/design-tokens/src/index.css` and the various
 * `design-system.css` bridges already establish today.
 */
export const FootGlobalStyle = createGlobalStyle`
  *:focus-visible {
    outline: 2px solid var(--foot-color-primary, #c8102e);
    outline-offset: 2px;
  }

  @media (prefers-reduced-motion: reduce) {
    *,
    *::before,
    *::after {
      animation-duration: 0.001ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.001ms !important;
      scroll-behavior: auto !important;
    }
  }
`

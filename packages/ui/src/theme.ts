import type { ReactNode } from 'react'
import { createElement } from 'react'
import { ThemeProvider, type DefaultTheme } from 'styled-components'

/**
 * The FOOT styled-components theme is intentionally "thin": every value is a
 * reference to a CSS custom property defined by `@foot/design-tokens`
 * (`packages/design-tokens/src/index.css`), never a hardcoded hex/px value.
 *
 * This keeps `@foot/design-tokens` the single source of truth. Components
 * can read `props.theme.colors.primary` instead of sprinkling
 * `var(--foot-color-primary)` everywhere, but the resolved value at runtime
 * is still whatever the CSS variable currently is (including dark-mode
 * overrides under `:root.dark`, and any per-portal overrides an embedding
 * page might apply later).
 */
export interface FootTheme {
  colors: {
    primary: string
    primaryDark: string
    primaryRgb: string
    secondary: string
    success: string
    info: string
    warning: string
    danger: string
    background: string
    surface: string
    text: string
    textMuted: string
    border: string
    dark: string
    onPrimary: string
  }
  font: {
    ui: string
    display: string
  }
  radius: {
    sm: string
    md: string
    lg: string
    full: string
  }
  shadow: {
    card: string
    cardHover: string
  }
  space: {
    /**
     * A conservative 4px-based scale expressed in rem so it still respects
     * the user's root font-size preference (accessibility).
     */
    '3xs': string
    '2xs': string
    xs: string
    sm: string
    md: string
    lg: string
    xl: string
    '2xl': string
    '3xl': string
  }
  touchTarget: string
  zIndex: {
    dropdown: number
    sticky: number
    overlay: number
    modal: number
    popover: number
    toast: number
    tooltip: number
  }
  motion: {
    fast: string
    base: string
    slow: string
  }
}

export const footTheme: FootTheme = {
  colors: {
    primary: 'var(--foot-color-primary)',
    primaryDark: 'var(--foot-color-primary-dark)',
    primaryRgb: 'var(--foot-color-primary-rgb)',
    secondary: 'var(--foot-color-secondary)',
    success: 'var(--foot-color-success)',
    info: 'var(--foot-color-info)',
    warning: 'var(--foot-color-warning)',
    danger: 'var(--foot-color-danger)',
    background: 'var(--foot-color-background)',
    surface: 'var(--foot-color-surface)',
    text: 'var(--foot-color-text)',
    textMuted: 'var(--foot-color-text-muted)',
    border: 'var(--foot-color-border)',
    dark: 'var(--foot-color-dark)',
    onPrimary: '#ffffff',
  },
  font: {
    ui: 'var(--foot-font-ui)',
    display: 'var(--foot-font-display)',
  },
  radius: {
    sm: 'var(--foot-radius-sm)',
    md: 'var(--foot-radius-md)',
    lg: 'var(--foot-radius-lg)',
    full: '999px',
  },
  shadow: {
    card: 'var(--foot-shadow-card)',
    cardHover: 'var(--foot-shadow-card-hover)',
  },
  space: {
    '3xs': '0.125rem',
    '2xs': '0.25rem',
    xs: '0.375rem',
    sm: '0.5rem',
    md: '0.75rem',
    lg: '1rem',
    xl: '1.5rem',
    '2xl': '2rem',
    '3xl': '3rem',
  },
  touchTarget: 'var(--foot-touch-target)',
  zIndex: {
    dropdown: 1000,
    sticky: 1020,
    overlay: 1040,
    modal: 1050,
    popover: 1060,
    toast: 1070,
    tooltip: 1080,
  },
  motion: {
    fast: '0.15s ease',
    base: '0.2s ease',
    slow: '0.3s ease',
  },
}

// Module augmentation so `props.theme` is typed throughout the package and
// for any consumer that later imports `DefaultTheme` from styled-components.
declare module 'styled-components' {
  // eslint-disable-next-line @typescript-eslint/no-empty-interface
  export interface DefaultTheme extends FootTheme {}
}

export interface FootThemeProviderProps {
  children?: ReactNode
  /**
   * Deep-merged on top of the default `footTheme`. Only pass this if a
   * consumer genuinely needs to override tokens (e.g. a storybook-only
   * experiment) — production surfaces should rely on the CSS custom
   * properties from `@foot/design-tokens` instead.
   */
  theme?: Partial<FootTheme>
}

/**
 * Thin wrapper over styled-components' `ThemeProvider` that seeds the FOOT
 * design tokens. Wrap your app (or a preview/storybook root) once:
 *
 * ```tsx
 * <FootThemeProvider>
 *   <App />
 * </FootThemeProvider>
 * ```
 */
export function FootThemeProvider({ children, theme }: FootThemeProviderProps) {
  const mergedTheme: DefaultTheme = theme
    ? ({ ...footTheme, ...theme } as DefaultTheme)
    : (footTheme as unknown as DefaultTheme)

  return createElement(ThemeProvider, { theme: mergedTheme }, children)
}

export interface ShellBrandingColors {
  primaryColor: string
  secondaryColor: string
  accentColor: string
}

export interface ShellClassNames {
  sidebarWrap: string
  menuToggle: string
  overlay: string
}

function normalizeNamespace(namespace: string): string {
  const normalized = namespace.trim().toLowerCase()
  if (!/^[a-z][a-z0-9-]*$/.test(normalized)) {
    throw new Error(`Invalid app-shell namespace: ${namespace}`)
  }
  return normalized
}

export function createShellClassNames(namespace: string): ShellClassNames {
  const prefix = normalizeNamespace(namespace)
  return {
    sidebarWrap: `${prefix}-sidebar-wrap`,
    menuToggle: `${prefix}-menu-toggle`,
    overlay: `${prefix}-overlay`,
  }
}

export function createBrandingVariables(
  namespace: string,
  branding: ShellBrandingColors,
): Record<string, string> {
  const prefix = normalizeNamespace(namespace)
  return {
    [`--${prefix}-primary`]: branding.primaryColor,
    [`--${prefix}-sidebar-bg`]: branding.secondaryColor,
    [`--${prefix}-accent`]: branding.accentColor,
  }
}

export function createResponsiveShellCss(namespace: string, breakpoint = 900): string {
  const classes = createShellClassNames(namespace)
  return `
    .${classes.sidebarWrap} {
      flex: 0 0 auto;
      min-width: 0;
    }

    .${classes.overlay} {
      touch-action: none;
    }

    @media (max-width: ${breakpoint}px) {
      .${classes.sidebarWrap} {
        position: fixed;
        inset-block: 0;
        inset-inline-start: 0;
        width: min(82vw, 18rem);
        max-width: calc(100vw - 3rem);
        transform: translateX(-100%);
        transition: transform 0.2s ease;
        z-index: 40;
      }

      [dir="rtl"] .${classes.sidebarWrap} {
        transform: translateX(100%);
      }

      .${classes.sidebarWrap}.open,
      [dir="rtl"] .${classes.sidebarWrap}.open {
        transform: translateX(0);
      }

      .${classes.sidebarWrap} > * {
        width: 100% !important;
        max-width: 100%;
        min-height: 100dvh;
      }

      .${classes.menuToggle} {
        display: inline-flex !important;
        align-items: center;
        justify-content: center;
        min-width: 44px;
        min-height: 44px;
      }

      .${classes.overlay} {
        display: block !important;
      }
    }

    @media (max-width: 640px) {
      .${classes.sidebarWrap} {
        width: min(88vw, 18rem);
        max-width: calc(100vw - 2rem);
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .${classes.sidebarWrap} {
        transition-duration: 0.001ms;
      }
    }
  `
}

export const DEFAULT_SHELL_CONTENT = {
  width: '100%',
  minWidth: 0,
  padding: 'clamp(0.75rem, 2vw, 1.5rem)',
  maxWidth: 1440,
  margin: '0 auto',
} as const

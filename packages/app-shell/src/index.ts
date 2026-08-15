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
    @media (max-width: ${breakpoint}px) {
      .${classes.sidebarWrap} {
        position: fixed;
        inset-block: 0;
        inset-inline-start: 0;
        transform: translateX(-100%);
        transition: transform 0.2s ease;
        z-index: 40;
      }
      [dir="rtl"] .${classes.sidebarWrap} { transform: translateX(100%); }
      .${classes.sidebarWrap}.open,
      [dir="rtl"] .${classes.sidebarWrap}.open { transform: translateX(0); }
      .${classes.menuToggle} { display: inline-flex !important; }
      .${classes.overlay} { display: block !important; }
    }
  `
}

export const DEFAULT_SHELL_CONTENT = {
  padding: '1.5rem',
  maxWidth: 1280,
  margin: '0 auto',
} as const

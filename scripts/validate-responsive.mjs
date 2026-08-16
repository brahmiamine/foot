import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const errors = []

async function read(relativePath) {
  return readFile(path.join(root, relativePath), 'utf8')
}

function requireFragments(relativePath, content, fragments) {
  for (const fragment of fragments) {
    if (!content.includes(fragment)) {
      errors.push(`${relativePath}: contrat responsive manquant: ${fragment}`)
    }
  }
}

const frontendApps = [
  'arbinote',
  'club-hub',
  'club-ob',
  'federation-hub',
  'identity',
  'match-operations',
  'medical-hub',
  'player-hub',
  'referee-hub',
  'seller-portal',
  'staff-hub',
  'ticketing',
]

const portalApps = ['medical-hub', 'player-hub', 'seller-portal', 'staff-hub', 'ticketing']
const internalAdminLayouts = [
  'club-hub/src/app/admin/layout.tsx',
  'federation-hub/src/app/layout.tsx',
  'match-operations/src/app/layout.tsx',
]
const tokenLayouts = [
  'club-hub/src/app/layout.tsx',
  'club-ob/src/app/layout.tsx',
  'identity/src/app/layout.tsx',
  'referee-hub/src/app/layout.tsx',
]

const tokens = await read('packages/design-tokens/src/index.css')
requireFragments('packages/design-tokens/src/index.css', tokens, [
  '--foot-page-gutter: clamp(',
  '--foot-touch-target: 44px',
  'overflow-x: clip',
  '.foot-responsive-table',
  '.foot-fluid-grid',
  '@media (max-width: 640px)',
])

const portalTheme = await read('packages/design-tokens/src/club-portal.css')
requireFragments('packages/design-tokens/src/club-portal.css', portalTheme, [
  'overflow-x: clip',
  'overscroll-behavior-inline: contain',
  'min-height: var(--foot-touch-target)',
  '@media (max-width: 640px)',
])

const adminTheme = await read('packages/design-tokens/src/internal-admin.css')
requireFragments('packages/design-tokens/src/internal-admin.css', adminTheme, [
  '.table-responsive',
  '.modal-dialog',
  'calc(100vw - 1rem)',
  '@media (max-width: 991.98px)',
  '@media (max-width: 767.98px)',
  '@media (max-width: 575.98px)',
])

const uiStyles = await read('packages/ui/src/styles.css')
requireFragments('packages/ui/src/styles.css', uiStyles, [
  'max-width: 100%',
  'min-height: var(--foot-touch-target)',
  '@media (max-width: 420px)',
])

const appShell = await read('packages/app-shell/src/index.ts')
requireFragments('packages/app-shell/src/index.ts', appShell, [
  'width: min(82vw, 18rem)',
  'min-width: 44px',
  "padding: 'clamp(0.75rem, 2vw, 1.5rem)'",
  '@media (prefers-reduced-motion: reduce)',
])

for (const app of portalApps) {
  const layoutPath = `${app}/src/app/layout.tsx`
  const layout = await read(layoutPath)
  if (!layout.includes('packages/design-tokens/src/club-portal.css')) {
    errors.push(`${layoutPath}: doit charger club-portal.css pour le contrat responsive`) 
  }
}

for (const layoutPath of internalAdminLayouts) {
  const layout = await read(layoutPath)
  if (!layout.includes('packages/design-tokens/src/internal-admin.css')) {
    errors.push(`${layoutPath}: doit charger internal-admin.css pour le contrat responsive`)
  }
}

for (const layoutPath of tokenLayouts) {
  const layout = await read(layoutPath)
  if (!layout.includes('packages/design-tokens/src/index.css')) {
    errors.push(`${layoutPath}: doit charger index.css pour le contrat responsive`) 
  }
}

const arbinoteLayout = await read('arbinote/src/app/layout.tsx')
const arbinoteResponsive = await read('arbinote/src/app/design-system.css')
if (!arbinoteLayout.includes('./design-system.css')) {
  errors.push('arbinote/src/app/layout.tsx: doit charger design-system.css')
}
requireFragments('arbinote/src/app/design-system.css', arbinoteResponsive, [
  '--arbinote-touch-target: 44px',
  'overflow-x: clip',
  '.arbinote-responsive-scroll',
  '@media (max-width: 640px)',
])

const sellerShell = await read('seller-portal/src/components/layout/DashboardShell.tsx')
requireFragments('seller-portal/src/components/layout/DashboardShell.tsx', sellerShell, [
  'createResponsiveShellCss("sp")',
  'DEFAULT_SHELL_CONTENT',
  'minHeight: "100dvh"',
])

if (frontendApps.length !== 12) {
  errors.push(`liste frontend inattendue: ${frontendApps.length} applications au lieu de 12`)
}

if (errors.length > 0) {
  console.error('Validation responsive echouee:')
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log(
  `Responsive valide: ${frontendApps.length} applications couvertes par les contrats FOOT (mobile, tablette, desktop et grands ecrans).`,
)

import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

const portalApps = [
  'player-hub',
  'medical-hub',
  'staff-hub',
  'seller-portal',
  'ticketing',
]
const internalAdminApps = ['federation-hub', 'match-operations']

const duplicatedPortalLiterals = [
  '#c8102e',
  '#a10d25',
  '#ffd9de',
  '#b8860b',
  '#0d0d0d',
  '#2a0a0f',
]

const requiredUiExports = ['Alert', 'Badge', 'Button', 'Card', 'Input', 'PageHeader']
const errors = []

async function read(relativePath) {
  return readFile(path.join(root, relativePath), 'utf8')
}

for (const app of portalApps) {
  const layoutPath = `${app}/src/app/layout.tsx`
  const globalsPath = `${app}/src/app/globals.css`
  const [layout, globals] = await Promise.all([read(layoutPath), read(globalsPath)])

  if (!layout.includes('packages/design-tokens/src/club-portal.css')) {
    errors.push(`${layoutPath}: doit charger le theme partage club-portal.css`)
  }

  if (!globals.includes('var(--foot-portal-')) {
    errors.push(`${globalsPath}: doit resoudre ses tokens depuis --foot-portal-*`)
  }

  for (const literal of duplicatedPortalLiterals) {
    if (globals.toLowerCase().includes(literal)) {
      errors.push(`${globalsPath}: valeur de theme dupliquee ${literal}; utiliser un token --foot-portal-*`)
    }
  }
}

for (const app of internalAdminApps) {
  const layoutPath = `${app}/src/app/layout.tsx`
  const layout = await read(layoutPath)
  if (!layout.includes('packages/design-tokens/src/internal-admin.css')) {
    errors.push(`${layoutPath}: doit charger le bridge partage internal-admin.css`)
  }
}

const sellerBranding = await read('seller-portal/src/lib/clubBranding.ts')
for (const [field, expected] of [
  ['primaryColor', '#c8102e'],
  ['secondaryColor', '#0d0d0d'],
  ['accentColor', '#b8860b'],
]) {
  if (!sellerBranding.includes(`${field}: "${expected}"`)) {
    errors.push(`seller-portal/src/lib/clubBranding.ts: fallback ${field} doit etre ${expected}`)
  }
}

const refereeLayout = await read('referee-hub/src/app/layout.tsx')
const refereeOverrides = await read('referee-hub/src/app/design-system.css')
if (!refereeLayout.includes('packages/design-tokens/src/index.css')) {
  errors.push('referee-hub/src/app/layout.tsx: doit charger les tokens FOOT')
}
if (!refereeLayout.includes('./design-system.css')) {
  errors.push('referee-hub/src/app/layout.tsx: doit charger les overrides design system')
}
if (!refereeOverrides.includes('--rh-red: var(--foot-color-primary)')) {
  errors.push('referee-hub/src/app/design-system.css: le rouge arbitre doit venir du token FOOT primaire')
}
if (!refereeOverrides.includes('prefers-reduced-motion')) {
  errors.push('referee-hub/src/app/design-system.css: reduced-motion doit etre pris en charge')
}

const identityLayout = await read('identity/src/app/layout.tsx')
const identityOverrides = await read('identity/src/app/design-system.css')
if (!identityLayout.includes('packages/design-tokens/src/index.css')) {
  errors.push('identity/src/app/layout.tsx: doit charger les tokens FOOT')
}
if (!identityOverrides.includes('--sso-accent: var(--foot-color-primary)')) {
  errors.push('identity/src/app/design-system.css: le rouge Identity doit venir du token FOOT primaire')
}
if (!identityOverrides.includes('prefers-reduced-motion')) {
  errors.push('identity/src/app/design-system.css: reduced-motion doit etre pris en charge')
}

const uiIndex = await read('packages/ui/src/index.ts')
for (const name of requiredUiExports) {
  if (!uiIndex.includes(`export { ${name} }`)) {
    errors.push(`packages/ui/src/index.ts: primitive partagee manquante: ${name}`)
  }
}

const portalTheme = await read('packages/design-tokens/src/club-portal.css')
for (const token of [
  '--foot-portal-primary',
  '--foot-portal-bg',
  '--foot-portal-surface',
  '--foot-portal-text',
  '--foot-portal-border',
  '--foot-portal-radius-md',
  '--foot-portal-shadow-md',
]) {
  if (!portalTheme.includes(token)) {
    errors.push(`packages/design-tokens/src/club-portal.css: token obligatoire manquant: ${token}`)
  }
}

const adminTheme = await read('packages/design-tokens/src/internal-admin.css')
for (const token of [
  '--foot-admin-background',
  '--foot-admin-text',
  '--foot-admin-sidebar',
  '--bs-primary',
]) {
  if (!adminTheme.includes(token)) {
    errors.push(`packages/design-tokens/src/internal-admin.css: token/bridge obligatoire manquant: ${token}`)
  }
}
if (!adminTheme.includes('prefers-reduced-motion')) {
  errors.push('packages/design-tokens/src/internal-admin.css: reduced-motion doit etre pris en charge')
}

if (errors.length > 0) {
  console.error('Validation design system echouee:')
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log(
  `Design system valide: ${portalApps.length} portails club et ${internalAdminApps.length} back-offices partagent les themes FOOT; Referee Hub et Identity utilisent la marque centrale; ${requiredUiExports.length} primitives UI sont exportees.`,
)

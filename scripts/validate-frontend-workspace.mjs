import { readFile, access } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

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

// Applications pnpm additionnelles installees depuis le workspace racine mais
// qui n'etendent pas packages/tsconfig/nextjs.json (ex: API NestJS).
const additionalWorkspaceApps = ['marketplace']

async function pathExists(relativePath) {
  return access(path.join(root, relativePath))
    .then(() => true)
    .catch(() => false)
}

const sharedPackages = {
  'packages/access-client': '@foot/access-client',
  'packages/app-shell': '@foot/app-shell',
  'packages/auth-shared': '@foot/auth-shared',
  'packages/club-client': '@foot/club-client',
  'packages/design-tokens': '@foot/design-tokens',
  'packages/domain-contracts': '@foot/domain-contracts',
  'packages/i18n': '@foot/i18n',
  'packages/identity-client': '@foot/identity-client',
  'packages/notifications-client': '@foot/notifications-client',
  'packages/referee-client': '@foot/referee-client',
  'packages/regulatory-client': '@foot/regulatory-client',
  'packages/regulatory-shared': '@foot/regulatory',
  'packages/tsconfig': '@foot/tsconfig',
  'packages/types': '@foot/types',
  'packages/ui': '@foot/ui',
  'packages/utils': '@foot/utils',
}

const errors = []

async function readJson(relativePath) {
  const content = await readFile(path.join(root, relativePath), 'utf8')
  return JSON.parse(content)
}

const workspace = await readFile(path.join(root, 'pnpm-workspace.yaml'), 'utf8')
for (const app of frontendApps) {
  if (!workspace.includes(`- "${app}"`) && !workspace.includes(`- '${app}'`)) {
    errors.push(`pnpm-workspace.yaml: application manquante: ${app}`)
  }

  const packageJson = await readJson(`${app}/package.json`).catch(() => null)
  if (!packageJson) {
    errors.push(`${app}: package.json manquant ou invalide`)
  }

  const tsconfig = await readJson(`${app}/tsconfig.json`).catch(() => null)
  if (!tsconfig) {
    errors.push(`${app}: tsconfig.json manquant ou invalide`)
  } else if (tsconfig.extends !== '../packages/tsconfig/nextjs.json') {
    errors.push(`${app}: doit etendre ../packages/tsconfig/nextjs.json`)
  }
}

if (!workspace.includes('- "packages/*"') && !workspace.includes("- 'packages/*'")) {
  errors.push('pnpm-workspace.yaml: packages/* doit etre inclus')
}

for (const app of additionalWorkspaceApps) {
  if (!workspace.includes(`- "${app}"`) && !workspace.includes(`- '${app}'`)) {
    errors.push(`pnpm-workspace.yaml: application manquante: ${app}`)
  }
}

// Le workspace doit rester une installation unique a la racine : aucune
// application ne doit reintroduire un lockfile ou un pnpm-workspace.yaml
// autonome qui l'isolerait de l'install racine (regression du mode
// --ignore-workspace retire lors de la normalisation du workspace).
for (const app of [...frontendApps, ...additionalWorkspaceApps]) {
  if (await pathExists(`${app}/pnpm-workspace.yaml`)) {
    errors.push(`${app}/pnpm-workspace.yaml: ne doit pas exister (workspace pnpm unique a la racine)`)
  }
  if (await pathExists(`${app}/pnpm-lock.yaml`)) {
    errors.push(`${app}/pnpm-lock.yaml: ne doit pas exister (lockfile pnpm partage a la racine)`)
  }
}

const npmrc = await readFile(path.join(root, '.npmrc'), 'utf8').catch(() => '')
if (/shared-workspace-lockfile\s*=\s*false/.test(npmrc) || /recursive-install\s*=\s*false/.test(npmrc)) {
  errors.push('.npmrc: les options de migration transitoire (shared-workspace-lockfile/recursive-install) doivent etre retirees')
}

for (const [packagePath, expectedName] of Object.entries(sharedPackages)) {
  const packageJson = await readJson(`${packagePath}/package.json`).catch(() => null)
  if (!packageJson) {
    errors.push(`${packagePath}: package.json manquant ou invalide`)
    continue
  }
  if (packageJson.name !== expectedName) {
    errors.push(`${packagePath}: nom attendu ${expectedName}, recu ${packageJson.name ?? '<absent>'}`)
  }
}

const turbo = await readJson('turbo.json')
for (const task of ['build', 'dev', 'lint', 'test', 'typecheck']) {
  if (!turbo.tasks?.[task]) {
    errors.push(`turbo.json: task manquante: ${task}`)
  }
}

const rootPackage = await readJson('package.json')
if (!rootPackage.devDependencies?.turbo) {
  errors.push('package.json racine: turbo doit etre declare en devDependency')
}

if (errors.length > 0) {
  console.error('Validation frontend workspace echouee:')
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log(
  `Frontend workspace valide: ${frontendApps.length} applications et ${Object.keys(sharedPackages).length} packages partages.`,
)

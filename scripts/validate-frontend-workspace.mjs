import { readFile } from 'node:fs/promises'
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

const sharedPackages = {
  'packages/access-client': '@foot/access-client',
  'packages/auth-shared': '@foot/auth-shared',
  'packages/design-tokens': '@foot/design-tokens',
  'packages/domain-contracts': '@foot/domain-contracts',
  'packages/i18n': '@foot/i18n',
  'packages/notifications-client': '@foot/notifications-client',
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

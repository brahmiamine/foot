import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

const applications = [
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

const sourceExtensions = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'])
const importPattern = /(?:from\s+|import\s*\(|require\s*\()\s*['"]([^'"]+)['"]/g
const serverInfrastructureImports = new Set([
  'typeorm',
  'mysql',
  'mysql2',
  'mariadb',
  'better-sqlite3',
  'node:net',
  'node:tls',
])

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true }).catch(() => [])
  const files = []

  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === '.next' || entry.name === 'dist' || entry.name === 'coverage') {
      continue
    }

    const absolute = path.join(directory, entry.name)
    if (entry.isDirectory()) files.push(...(await walk(absolute)))
    else if (sourceExtensions.has(path.extname(entry.name))) files.push(absolute)
  }

  return files
}

function importsOf(source) {
  return [...source.matchAll(importPattern)].map((match) => match[1])
}

function referencesAnotherApplication(specifier, currentApp) {
  for (const otherApp of applications) {
    if (otherApp === currentApp) continue
    if (
      specifier === otherApp ||
      specifier.startsWith(`${otherApp}/`) ||
      specifier.includes(`/${otherApp}/`) ||
      specifier.endsWith(`/${otherApp}`)
    ) {
      return otherApp
    }
  }
  return null
}

const errors = []

// Applications are independently deployable boundaries. They may consume
// packages/*, HTTP APIs and events, but never source code owned by another app.
for (const app of applications) {
  const files = await walk(path.join(root, app, 'src'))
  for (const file of files) {
    const source = await readFile(file, 'utf8')
    for (const specifier of importsOf(source)) {
      const otherApp = referencesAnotherApplication(specifier, app)
      if (otherApp) {
        errors.push(
          `${path.relative(root, file)} imports application boundary ${otherApp}: ${specifier}`,
        )
      }
    }
  }
}

// Shared packages must remain reusable building blocks. In particular they
// cannot become a back door to the shared MariaDB or own deployable-app code.
const packageDirs = await readdir(path.join(root, 'packages'), { withFileTypes: true })
for (const entry of packageDirs) {
  if (!entry.isDirectory()) continue
  const packageRoot = path.join(root, 'packages', entry.name)
  const files = await walk(packageRoot)

  for (const file of files) {
    const source = await readFile(file, 'utf8')
    for (const specifier of importsOf(source)) {
      const infrastructurePackage = [...serverInfrastructureImports].find(
        (dependency) => specifier === dependency || specifier.startsWith(`${dependency}/`),
      )
      if (infrastructurePackage) {
        errors.push(
          `${path.relative(root, file)} imports DB/server infrastructure ${infrastructurePackage}; shared packages must stay infrastructure-agnostic`,
        )
      }

      const appReference = applications.find(
        (app) => specifier.includes(`/${app}/`) || specifier.endsWith(`/${app}`),
      )
      if (appReference) {
        errors.push(
          `${path.relative(root, file)} imports deployable application ${appReference}: ${specifier}`,
        )
      }
    }
  }
}

if (errors.length > 0) {
  console.error('Architecture boundary validation failed:')
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log(
  `Architecture boundaries valid: ${applications.length} deployable frontend applications and shared packages are isolated.`,
)

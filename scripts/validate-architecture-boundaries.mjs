import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

const deployables = [
  'arbinote',
  'club-hub',
  'club-ob',
  'federation-hub',
  'identity',
  'marketplace',
  'match-operations',
  'medical-hub',
  'notifications',
  'payments',
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

const matchRegulatoryReadModelAllowlist = new Set([
  'match-operations/src/lib/db.ts',
  'match-operations/src/test/testDataSource.ts',
  'match-operations/src/adapters/regulatory/SharedDatabaseEligibilityAdapter.ts',
  'match-operations/src/adapters/regulatory/SharedDatabaseStaffQualificationAdapter.ts',
])

const matchRefereeAvailabilityAllowlist = new Set([
  'match-operations/src/lib/db.ts',
  'match-operations/src/test/testDataSource.ts',
  'match-operations/src/adapters/referee/SharedDatabaseRefereeAvailabilityAdapter.ts',
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

function isInside(candidate, directory) {
  const relative = path.relative(directory, candidate)
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative))
}

function referencesAnotherDeployable(specifier, currentDeployable, importingFile) {
  // `@/...` is a local source alias inside the current application.
  if (specifier.startsWith('@/')) return null

  if (specifier.startsWith('.')) {
    const resolved = path.resolve(path.dirname(importingFile), specifier)
    for (const otherDeployable of deployables) {
      if (otherDeployable === currentDeployable) continue
      if (isInside(resolved, path.join(root, otherDeployable))) return otherDeployable
    }
    return null
  }

  for (const otherDeployable of deployables) {
    if (otherDeployable === currentDeployable) continue
    if (specifier === otherDeployable || specifier.startsWith(`${otherDeployable}/`)) {
      return otherDeployable
    }
  }

  return null
}

const errors = []

// Deployable units may consume packages/*, HTTP APIs and events, but never
// source code owned by another independently deployable unit.
for (const deployable of deployables) {
  const files = await walk(path.join(root, deployable, 'src'))
  for (const file of files) {
    const source = await readFile(file, 'utf8')
    for (const specifier of importsOf(source)) {
      const otherDeployable = referencesAnotherDeployable(specifier, deployable, file)
      if (otherDeployable) {
        errors.push(
          `${path.relative(root, file)} imports deployable boundary ${otherDeployable}: ${specifier}`,
        )
      }
    }
  }
}

// The legacy shared-DB regulatory read models in match-operations are a
// transitional adapter detail. New services/routes must depend on ports and
// cannot reintroduce direct imports of those read models.
for (const file of await walk(path.join(root, 'match-operations', 'src'))) {
  const relativeFile = path.relative(root, file).split(path.sep).join('/')
  if (matchRegulatoryReadModelAllowlist.has(relativeFile)) continue
  const source = await readFile(file, 'utf8')
  if (importsOf(source).includes('@/entities/Eligibility')) {
    errors.push(
      `${relativeFile} imports federation regulatory read models directly; use an adapter/port instead`,
    )
  }
}

// referee_unavailabilities belongs to referee-hub. Match may keep a shared-DB
// adapter during migration, but orchestration/services cannot read the entity
// directly anymore.
for (const file of await walk(path.join(root, 'match-operations', 'src'))) {
  const relativeFile = path.relative(root, file).split(path.sep).join('/')
  if (matchRefereeAvailabilityAllowlist.has(relativeFile)) continue
  const source = await readFile(file, 'utf8')
  if (importsOf(source).includes('@/entities/RefereeUnavailability')) {
    errors.push(
      `${relativeFile} imports referee availability storage directly; use RefereeAvailabilityPort instead`,
    )
  }
}

// Shared packages must remain reusable building blocks. In particular they
// cannot become a back door to MariaDB/TypeORM or deployable-unit source code.
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

      if (specifier.startsWith('.')) {
        const resolved = path.resolve(path.dirname(file), specifier)
        const deployableReference = deployables.find((app) => isInside(resolved, path.join(root, app)))
        if (deployableReference) {
          errors.push(
            `${path.relative(root, file)} imports deployable application ${deployableReference}: ${specifier}`,
          )
        }
      } else {
        const deployableReference = deployables.find(
          (app) => specifier === app || specifier.startsWith(`${app}/`),
        )
        if (deployableReference) {
          errors.push(
            `${path.relative(root, file)} imports deployable application ${deployableReference}: ${specifier}`,
          )
        }
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
  `Architecture boundaries valid: ${deployables.length} deployable units and shared packages are isolated.`,
)

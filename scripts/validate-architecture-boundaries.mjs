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

const matchClubLineupAllowlist = new Set([
  'match-operations/src/lib/db.ts',
  'match-operations/src/test/testDataSource.ts',
  'match-operations/src/adapters/club/SharedDatabaseClubLineupAdapter.ts',
])

const federationRefereeAvailabilityAllowlist = new Set([
  'federation-hub/src/lib/db.ts',
  'federation-hub/src/test/testDataSource.ts',
  'federation-hub/src/lib/entities/index.ts',
  'federation-hub/src/adapters/referee/SharedDatabaseRefereeAvailabilityDirectoryAdapter.ts',
])

// Identity owns the User table. Federation may keep the entity registered in
// its transitional DataSource, but application services/routes must consume
// Identity's authenticated service API instead of reading/writing User.
const federationIdentityUserAllowlist = new Set([
  'federation-hub/src/lib/db.ts',
  'federation-hub/src/test/testDataSource.ts',
  'federation-hub/src/lib/entities/index.ts',
  'federation-hub/src/lib/entities/User.ts',
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

function importsNamedFrom(source, name, specifier) {
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const escapedSpecifier = specifier.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const pattern = new RegExp(
    `import\\s*(?:type\\s*)?\\{[^}]*\\b${escapedName}\\b[^}]*\\}\\s*from\\s*['"]${escapedSpecifier}['"]`,
    'm',
  )
  return pattern.test(source)
}

const errors = []

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

for (const file of await walk(path.join(root, 'match-operations', 'src'))) {
  const relativeFile = path.relative(root, file).split(path.sep).join('/')
  if (matchClubLineupAllowlist.has(relativeFile)) continue
  const source = await readFile(file, 'utf8')
  if (importsOf(source).includes('@/entities/MatchLineup')) {
    errors.push(
      `${relativeFile} imports club lineup storage directly; use ClubLineupReadPort instead`,
    )
  }
}

for (const file of await walk(path.join(root, 'federation-hub', 'src'))) {
  const relativeFile = path.relative(root, file).split(path.sep).join('/')
  if (federationRefereeAvailabilityAllowlist.has(relativeFile)) continue
  const source = await readFile(file, 'utf8')
  const imports = importsOf(source)
  const directEntityImport = imports.includes('@/lib/entities/RefereeUnavailability')
  const broadEntityImport = imports.includes('./entities') && /\bRefereeUnavailability\b/.test(source)
  if (directEntityImport || broadEntityImport) {
    errors.push(
      `${relativeFile} imports referee availability storage directly; use RefereeAvailabilityDirectoryPort instead`,
    )
  }
}

for (const file of await walk(path.join(root, 'federation-hub', 'src'))) {
  const relativeFile = path.relative(root, file).split(path.sep).join('/')
  if (federationIdentityUserAllowlist.has(relativeFile)) continue
  const source = await readFile(file, 'utf8')
  const imports = importsOf(source)
  const directEntityImport =
    imports.includes('@/lib/entities/User') ||
    imports.includes('./entities/User') ||
    imports.includes('../entities/User')
  const broadEntityImport =
    imports.includes('./entities') && importsNamedFrom(source, 'User', './entities')

  if (directEntityImport || broadEntityImport) {
    errors.push(
      `${relativeFile} imports Identity-owned User storage directly; use @foot/identity-client instead`,
    )
  }
}

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

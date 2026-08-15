import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const sourceExtensions = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'])
const importPattern = /(?:from\s+|import\s*\(|require\s*\()\s*['"]([^'"]+)['"]/g

const boundaries = {
  'staff-hub': new Set([
    'staff-hub/src/lib/database.ts',
    'staff-hub/src/test/testDataSource.ts',
    'staff-hub/src/entities/Role.ts',
    'staff-hub/src/entities/UserRole.ts',
    'staff-hub/src/adapters/club/SharedDatabaseClubRbacAdapter.ts',
  ]),
  'medical-hub': new Set([
    'medical-hub/src/lib/database.ts',
    'medical-hub/src/test/testDataSource.ts',
    'medical-hub/src/entities/Role.ts',
    'medical-hub/src/entities/UserRole.ts',
    'medical-hub/src/adapters/club/SharedDatabaseClubRbacAdapter.ts',
  ]),
}

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true }).catch(() => [])
  const files = []
  for (const entry of entries) {
    if (['node_modules', '.next', 'dist', 'coverage'].includes(entry.name)) continue
    const absolute = path.join(directory, entry.name)
    if (entry.isDirectory()) files.push(...(await walk(absolute)))
    else if (sourceExtensions.has(path.extname(entry.name))) files.push(absolute)
  }
  return files
}

function importsOf(source) {
  return [...source.matchAll(importPattern)].map((match) => match[1])
}

const errors = []
for (const [app, allowlist] of Object.entries(boundaries)) {
  for (const file of await walk(path.join(root, app, 'src'))) {
    const relative = path.relative(root, file).split(path.sep).join('/')
    if (allowlist.has(relative) || relative.endsWith('.test.ts')) continue

    const imports = importsOf(await readFile(file, 'utf8'))
    if (imports.includes('@/entities/Role') || imports.includes('@/entities/UserRole')) {
      errors.push(
        `${relative} imports Club-owned RBAC storage directly; use ClubRbacReadPort instead`,
      )
    }
  }
}

if (errors.length) {
  console.error('Club RBAC boundary validation failed:')
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log('Club RBAC boundaries valid: specialized hubs consume ClubRbacReadPort outside transition adapters.')

import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const regulatoryService = path.join(
  root,
  'federation-hub/src/domain/regulatory/RegulatoryEligibilityService.ts',
)
const source = await readFile(regulatoryService, 'utf8')

const forbiddenStorageDetails = [
  { pattern: /cms_team_members/i, label: 'cms_team_members' },
  { pattern: /\bFROM\s+Suspension\b/i, label: 'Suspension table' },
  { pattern: /\bFROM\s+Player\b/i, label: 'Player table' },
]

const errors = forbiddenStorageDetails
  .filter(({ pattern }) => pattern.test(source))
  .map(
    ({ label }) =>
      `federation-hub regulatory decision knows Club storage detail ${label}; consume ClubPlayerRegulatoryFactsPort instead`,
  )

if (errors.length) {
  console.error('Club player facts boundary validation failed:')
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log('Club player facts boundary valid: Federation consumes Club-owned facts through a port.')

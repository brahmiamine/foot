import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const adapterPath = path.join(
  root,
  'federation-hub/src/adapters/club/createClubPlayerFactsAdapter.ts',
)
const source = await readFile(adapterPath, 'utf8')

const errors = []
if (!source.includes('CLUB_PLAYER_FACTS_URL')) {
  errors.push('Club player facts adapter must use CLUB_PLAYER_FACTS_URL')
}
if (!source.includes('CLUB_PLAYER_FACTS_SERVICE_API_KEY')) {
  errors.push('Club player facts adapter must use CLUB_PLAYER_FACTS_SERVICE_API_KEY')
}
if (/env\.CLUB_HUB_URL\b/.test(source)) {
  errors.push('Club player facts adapter must not use saga variable CLUB_HUB_URL')
}
if (/env\.CLUB_HUB_SERVICE_API_KEY\b/.test(source)) {
  errors.push('Club player facts adapter must not use generic saga activation key')
}

if (errors.length) {
  console.error('Club player facts activation validation failed:')
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log('Club player facts activation is isolated from the match saga configuration.')

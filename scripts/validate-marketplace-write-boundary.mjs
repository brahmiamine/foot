import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

// These seller-portal routes may read the shared marketplace tables during
// transition, but all mutations must go through the Marketplace API.
const mutationRoutes = [
  'seller-portal/src/app/api/products/route.ts',
  'seller-portal/src/app/api/products/[id]/route.ts',
  'seller-portal/src/app/api/products/[id]/duplicate/route.ts',
  'seller-portal/src/app/api/products/[id]/variants/route.ts',
  'seller-portal/src/app/api/product-variants/[id]/route.ts',
  'seller-portal/src/app/api/inventory/[id]/route.ts',
  'seller-portal/src/app/api/sellers/me/route.ts',
]

const forbiddenWrites = [
  /\.save\s*\(/,
  /\.remove\s*\(/,
  /\.delete\s*\(/,
  /\.insert\s*\(/,
  /\.update\s*\(/,
  /manager\.create\s*\(/,
  /manager\.save\s*\(/,
  /createQueryBuilder\([^)]*\)[\s\S]{0,500}\.(?:insert|update|delete)\s*\(/,
]

const errors = []
for (const relative of mutationRoutes) {
  const source = await readFile(path.join(root, relative), 'utf8')
  for (const pattern of forbiddenWrites) {
    if (pattern.test(source)) {
      errors.push(`${relative}: direct marketplace persistence mutation detected (${pattern})`)
    }
  }
}

if (errors.length) {
  console.error('Marketplace write ownership validation failed:')
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log(
  `Marketplace write ownership valid: ${mutationRoutes.length} seller-portal mutation routes delegate writes to marketplace.`,
)

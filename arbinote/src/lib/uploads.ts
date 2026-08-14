import { mkdir } from 'node:fs/promises'
import path from 'node:path'

// Utiliser public/uploads/arbitres pour être cohérent avec fédérations et ligues
export const arbitreUploadsDir = path.join(process.cwd(), 'public', 'uploads', 'arbitres')

export async function ensureArbitreUploadsDir() {
  await mkdir(arbitreUploadsDir, { recursive: true })
}

export function buildArbitrePhotoPath(filename: string) {
  return path.join(arbitreUploadsDir, filename)
}

export function buildArbitrePhotoUrl(filename: string) {
  // Utiliser /api/uploads/arbitre/ pour être cohérent avec les anciennes images en production
  // La route API fonctionne mieux en production que le service direct depuis public/
  return `/api/uploads/arbitre/${filename}`
}

export function sanitizeFilename(originalName: string, fallbackExt = '.dat') {
  const safeName = originalName.replace(/[^a-zA-Z0-9.-]/g, '_')
  if (safeName.includes('.')) {
    return safeName
  }
  return `${safeName}${fallbackExt}`
}



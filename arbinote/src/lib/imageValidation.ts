/**
 * Validation du contenu réel des images uploadées (octets magiques).
 * Ne jamais faire confiance au `type` (MIME) ou au nom de fichier envoyés par le
 * client : ils sont entièrement falsifiables et permettraient d'écrire n'importe quel
 * contenu (ex. HTML/JS) dans public/uploads, servi statiquement par Next.js.
 */

export const MAX_IMAGE_UPLOAD_SIZE_BYTES = 5 * 1024 * 1024 // 5 Mo

export interface DetectedImage {
  extension: '.jpg' | '.png' | '.webp'
  mime: 'image/jpeg' | 'image/png' | 'image/webp'
}

function matchesSignature(buffer: Buffer, signature: number[], offset = 0): boolean {
  if (buffer.length < offset + signature.length) return false
  for (let i = 0; i < signature.length; i++) {
    if (buffer[offset + i] !== signature[i]) return false
  }
  return true
}

/**
 * Détecte le type d'image à partir des octets magiques du fichier.
 * Retourne null si le contenu ne correspond à aucun format d'image autorisé.
 */
export function detectImageType(buffer: Buffer): DetectedImage | null {
  // JPEG : FF D8 FF
  if (matchesSignature(buffer, [0xff, 0xd8, 0xff])) {
    return { extension: '.jpg', mime: 'image/jpeg' }
  }

  // PNG : 89 50 4E 47 0D 0A 1A 0A
  if (matchesSignature(buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return { extension: '.png', mime: 'image/png' }
  }

  // WEBP : "RIFF" + 4 octets de taille + "WEBP"
  if (
    matchesSignature(buffer, [0x52, 0x49, 0x46, 0x46]) &&
    buffer.length >= 12 &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return { extension: '.webp', mime: 'image/webp' }
  }

  return null
}

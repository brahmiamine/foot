import { NextRequest, NextResponse } from 'next/server'
import { Buffer } from 'node:buffer'
import path from 'node:path'
import { writeFile } from 'node:fs/promises'
import { ensureAdminAuth } from '@/lib/adminAuth'
import {
  buildArbitrePhotoPath,
  buildArbitrePhotoUrl,
  ensureArbitreUploadsDir,
  sanitizeFilename,
} from '@/lib/uploads'
import { detectImageType, MAX_IMAGE_UPLOAD_SIZE_BYTES } from '@/lib/imageValidation'

export const runtime = 'nodejs'

// Supprimer la limite de taille pour les uploads
export const maxDuration = 60
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const unauthorized = await ensureAdminAuth(request)
  if (unauthorized) {
    return unauthorized
  }

  const formData = await request.formData()
  const file = formData.get('file')

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: 'File is required' }, { status: 400 })
  }

  if (file.size > MAX_IMAGE_UPLOAD_SIZE_BYTES) {
    return NextResponse.json({ error: 'File is too large (max 5MB)' }, { status: 400 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())

  // Ne jamais faire confiance au type/nom fourni par le client : on détecte le
  // format réel à partir du contenu du fichier.
  const detected = detectImageType(buffer)
  if (!detected) {
    return NextResponse.json(
      { error: 'Invalid or unsupported image file (only JPEG, PNG, WEBP are allowed)' },
      { status: 400 }
    )
  }

  const safeBaseName = sanitizeFilename(path.parse(file.name).name, '')
  const timestamp = Date.now()
  const filename = `${safeBaseName || 'arbitre'}-${timestamp}${detected.extension}`
  const fullPath = buildArbitrePhotoPath(filename)

  await ensureArbitreUploadsDir()
  await writeFile(fullPath, buffer)

  return NextResponse.json({
    filename,
    url: buildArbitrePhotoUrl(filename),
  })
}



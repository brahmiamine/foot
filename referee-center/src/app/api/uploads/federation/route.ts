import { NextRequest, NextResponse } from 'next/server'
import { Buffer } from 'node:buffer'
import path from 'node:path'
import { writeFile } from 'node:fs/promises'
import { ensureAdminAuth } from '@/lib/adminAuth'
import { mkdir } from 'node:fs/promises'
import { detectImageType, MAX_IMAGE_UPLOAD_SIZE_BYTES } from '@/lib/imageValidation'

export const runtime = 'nodejs'

// Supprimer la limite de taille pour les uploads
export const maxDuration = 60
export const dynamic = 'force-dynamic'

function sanitizeFilename(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_{2,}/g, '_')
    .toLowerCase()
}

async function ensureFederationUploadsDir() {
  const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'federations')
  await mkdir(uploadsDir, { recursive: true })
  return uploadsDir
}

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

  const detected = detectImageType(buffer)
  if (!detected) {
    return NextResponse.json(
      { error: 'Invalid or unsupported image file (only JPEG, PNG, WEBP are allowed)' },
      { status: 400 }
    )
  }

  const safeBaseName = sanitizeFilename(path.parse(file.name).name)
  const timestamp = Date.now()
  const filename = `${safeBaseName || 'federation'}-${timestamp}${detected.extension}`
  const uploadsDir = await ensureFederationUploadsDir()
  const fullPath = path.join(uploadsDir, filename)

  await writeFile(fullPath, buffer)

  return NextResponse.json({
    filename,
    url: `/api/uploads/federation/${filename}`,
  })
}


import { NextRequest, NextResponse } from 'next/server'
import path from 'node:path'
import { readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { buildArbitrePhotoPath } from '@/lib/uploads'

export const runtime = 'nodejs'

function getMimeType(filename: string) {
  const ext = path.extname(filename).toLowerCase()
  switch (ext) {
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg'
    case '.png':
      return 'image/png'
    case '.webp':
      return 'image/webp'
    default:
      return 'application/octet-stream'
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params
    
    // Sécurité : valider le nom de fichier
    if (!filename || filename.includes('..') || filename.includes('/')) {
      return new NextResponse('Invalid filename', { 
        status: 400,
        headers: { 'Content-Type': 'text/plain' }
      })
    }

    const filePath = buildArbitrePhotoPath(filename)

    if (!existsSync(filePath)) {
      console.error(`File not found: ${filePath}`)
      return new NextResponse('File not found', { 
        status: 404,
        headers: { 'Content-Type': 'text/plain' }
      })
    }

    const file = await readFile(filePath)
    return new NextResponse(file, {
      headers: {
        'Content-Type': getMimeType(filename),
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  } catch (error) {
    console.error('Error serving arbitre upload:', error)
    return new NextResponse('Internal server error', { 
      status: 500,
      headers: { 'Content-Type': 'text/plain' }
    })
  }
}



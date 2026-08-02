import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { existsSync } from 'node:fs'

export const runtime = 'nodejs'

export async function GET(
  request: NextRequest,
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

    const filePath = path.join(process.cwd(), 'public', 'uploads', 'leagues', filename)

    if (!existsSync(filePath)) {
      console.error(`File not found: ${filePath}`)
      return new NextResponse('File not found', { 
        status: 404,
        headers: { 'Content-Type': 'text/plain' }
      })
    }

    const fileBuffer = await readFile(filePath)
    const ext = path.extname(filename).toLowerCase()

    const contentType =
      ext === '.jpg' || ext === '.jpeg'
        ? 'image/jpeg'
        : ext === '.png'
        ? 'image/png'
        : ext === '.webp'
        ? 'image/webp'
        : 'application/octet-stream'

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  } catch (error) {
    console.error('Error serving league file:', error)
    return new NextResponse('Internal server error', { 
      status: 500,
      headers: { 'Content-Type': 'text/plain' }
    })
  }
}


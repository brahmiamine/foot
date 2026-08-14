import { NextResponse } from 'next/server'
import { safeErrorMessage } from '@/lib/apiError'
import { getDataSource } from '@/lib/db'
import { hasAdminSession } from '@/lib/adminAuth'

export async function GET() {
  try {
    // Vérifier l'authentification admin
    const authenticated = await hasAdminSession()
    if (!authenticated) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const dataSource = await getDataSource()

    interface ContactMessageRow {
      id: string
      email: string
      subject: string
      message: string
      device_fingerprint: string | null
      created_at: Date | string | null
    }

    // Utiliser directement une requête SQL brute pour éviter les problèmes de métadonnées TypeORM
    const rawMessages = await dataSource.query<ContactMessageRow[]>(
      'SELECT id, email, subject, message, device_fingerprint, created_at FROM contact_messages ORDER BY created_at DESC'
    )

    const messages = rawMessages.map((msg) => ({
      id: msg.id,
      email: msg.email,
      subject: msg.subject,
      message: msg.message,
      device_fingerprint: msg.device_fingerprint || null,
      created_at: msg.created_at 
        ? (msg.created_at instanceof Date 
          ? msg.created_at.toISOString() 
          : new Date(msg.created_at).toISOString())
        : null,
    }))

    return NextResponse.json(messages)
  } catch (error) {
    console.error('Error fetching contact messages:', error)

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: safeErrorMessage(error, 'Unknown error'),
      },
      { status: 500 }
    )
  }
}


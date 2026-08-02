import { NextResponse } from 'next/server'
import { getDataSource } from '@/lib/db'
import { Contact } from '@/lib/entities'
import { hasFingerprintProof } from '@/lib/fingerprintProof'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const fingerprint = searchParams.get('fingerprint')

    if (!fingerprint) {
      return NextResponse.json(
        { error: 'Fingerprint is required' },
        { status: 400 }
      )
    }

    // Protection IDOR : les messages de contact contiennent l'email et le texte du
    // visiteur. Sans la preuve cookie liée à cette empreinte, on ne renvoie rien.
    if (!hasFingerprintProof(request, fingerprint)) {
      return NextResponse.json([])
    }

    const dataSource = await getDataSource()

    // Utiliser une requête SQL brute pour récupérer les messages de l'utilisateur
    const messages = await dataSource.query(
      'SELECT id, email, subject, message, created_at FROM contact_messages WHERE device_fingerprint = ? ORDER BY created_at DESC',
      [fingerprint]
    )

    // Formater les messages
    const messagesData = messages.map((msg: any) => ({
      id: msg.id,
      email: msg.email,
      subject: msg.subject,
      message: msg.message,
      created_at: msg.created_at ? (msg.created_at instanceof Date ? msg.created_at.toISOString() : msg.created_at) : null,
    }))

    return NextResponse.json(messagesData)
  } catch (error) {
    console.error('Error fetching user contact messages:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}


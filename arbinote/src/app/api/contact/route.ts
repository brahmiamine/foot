import { NextResponse } from 'next/server'
import { safeErrorMessage } from '@/lib/apiError'
import { getDataSource } from '@/lib/db'
import { Contact } from '@/lib/entities'
import { issueFingerprintProofCookie } from '@/lib/fingerprintProof'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, subject, message, device_fingerprint } = body

    // Validation
    if (!email || !subject || !message) {
      return NextResponse.json(
        { error: 'Missing required fields: email, subject, and message are required' },
        { status: 400 }
      )
    }

    // Validation email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    // Validation length
    if (subject.length > 500) {
      return NextResponse.json(
        { error: 'Subject must be 500 characters or less' },
        { status: 400 }
      )
    }

    if (message.length > 5000) {
      return NextResponse.json(
        { error: 'Message must be 5000 characters or less' },
        { status: 400 }
      )
    }

    const dataSource = await getDataSource()

    // Vérifier si l'utilisateur a déjà envoyé un message aujourd'hui
    if (device_fingerprint) {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)

      // Utiliser une requête SQL brute pour vérifier si un message existe aujourd'hui
      const existingMessages = await dataSource.query(
        'SELECT id FROM contact_messages WHERE device_fingerprint = ? AND created_at >= ? AND created_at < ? LIMIT 1',
        [device_fingerprint, today, tomorrow]
      )

      if (existingMessages && existingMessages.length > 0) {
        return NextResponse.json(
          { error: 'Vous avez déjà envoyé un message aujourd\'hui. Vous ne pouvez envoyer qu\'un seul message par jour.' },
          { status: 400 }
        )
      }
    }

    // Récupérer le repository ou utiliser SQL brut
    const hasContactEntity = dataSource.entityMetadatas.some(
      (meta) => meta.name === 'Contact' || meta.tableName === 'contact_messages'
    )

    let saved: any

    if (hasContactEntity) {
      try {
        const contactRepo = dataSource.getRepository(Contact)
        const contact = contactRepo.create({
          email: email.trim(),
          subject: subject.trim(),
          message: message.trim(),
          device_fingerprint: device_fingerprint || null,
        })
        saved = await contactRepo.save(contact)
      } catch (repoError) {
        // Fallback: utiliser SQL brut
        const result = await dataSource.query(
          'INSERT INTO contact_messages (id, email, subject, message, device_fingerprint, created_at) VALUES (UUID(), ?, ?, ?, ?, NOW())',
          [email.trim(), subject.trim(), message.trim(), device_fingerprint || null]
        )
        saved = { id: result.insertId || null }
      }
    } else {
      // Utiliser SQL brut directement
      const result = await dataSource.query(
        'INSERT INTO contact_messages (id, email, subject, message, device_fingerprint, created_at) VALUES (UUID(), ?, ?, ?, ?, NOW())',
        [email.trim(), subject.trim(), message.trim(), device_fingerprint || null]
      )
      saved = { id: result.insertId || null }
    }

    const response = NextResponse.json(
      {
        success: true,
        id: saved.id,
        message: 'Contact message sent successfully'
      },
      { status: 201 }
    )
    if (device_fingerprint) {
      issueFingerprintProofCookie(response, device_fingerprint)
    }
    return response
  } catch (error) {
    console.error('Error submitting contact message:', error)
    const errorMessage = safeErrorMessage(error, 'Internal server error')
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}


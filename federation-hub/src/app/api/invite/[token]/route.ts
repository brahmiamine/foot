import { NextRequest, NextResponse } from 'next/server'
import { getInvitationPreview, acceptInvitation } from '@/lib/staffInvitations'

export const runtime = 'nodejs'

/**
 * Routes publiques (pas de session requise) — voir federation-hub/src/app/invite/[token]/page.tsx.
 * Le jeton lui-même est le secret : personne d'autre que le destinataire de
 * l'email ne le connaît, même principe que /api/reset-password côté sso.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const preview = await getInvitationPreview(token)
  if (!preview) {
    return NextResponse.json({ error: 'Invitation invalide ou expirée' }, { status: 404 })
  }
  return NextResponse.json(preview)
}

const MIN_PASSWORD_LENGTH = 8

export async function POST(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params
    const body = await request.json()
    const password = typeof body.password === 'string' ? body.password : ''

    if (password.length < MIN_PASSWORD_LENGTH) {
      return NextResponse.json(
        { error: `Le mot de passe doit contenir au moins ${MIN_PASSWORD_LENGTH} caractères` },
        { status: 400 },
      )
    }

    const result = await acceptInvitation(token, password)
    if (!result.ok) {
      const message =
        result.error === 'invalid_or_expired_token'
          ? 'Cette invitation est invalide ou a expiré.'
          : 'Un compte existe déjà avec cet email.'
      return NextResponse.json({ error: message }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error accepting staff invitation:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

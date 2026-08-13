import { NextRequest, NextResponse } from 'next/server'
import { safeErrorMessage } from '@/lib/apiError'
import { ensureAdminAuth, ensureAdminOrFederationAuth } from '@/lib/adminAuth'
import { ArbitreInput, createArbitre, listArbitres } from '@/lib/adminArbitres'
import { logAdminAction } from '@/lib/auditLog'

export const runtime = 'nodejs'

/** Lecture ouverte à FEDERATION_ADMIN (référentiel arbitres, non sensible — sélecteur de l'écran officiels de match). */
export async function GET(request: NextRequest) {
  const unauthorized = await ensureAdminOrFederationAuth(request)
  if (unauthorized) return unauthorized

  try {
    const arbitres = await listArbitres()
    return NextResponse.json(arbitres)
  } catch (error) {
    console.error('Error fetching arbitres for admin:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const unauthorized = await ensureAdminAuth(request)
  if (unauthorized) return unauthorized

  try {
    const payload = (await request.json()) as ArbitreInput
    const arbitre = await createArbitre(payload)
    await logAdminAction({ request, action: 'create', entityType: 'arbitre', entityId: arbitre.id, summary: arbitre.nom })
    return NextResponse.json(arbitre, { status: 201 })
  } catch (error) {
    console.error('Error creating arbitre:', error)
    return NextResponse.json(
      { error: safeErrorMessage(error) },
      { status: 400 }
    )
  }
}



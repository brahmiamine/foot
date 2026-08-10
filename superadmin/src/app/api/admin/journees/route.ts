import { NextRequest, NextResponse } from 'next/server'
import { safeErrorMessage } from '@/lib/apiError'
import { ensureAdminAuth } from '@/lib/adminAuth'
import { listJourneesForAdmin, createJourneeAdmin } from '@/lib/adminJournees'
import { logAdminAction } from '@/lib/auditLog'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const unauthorized = await ensureAdminAuth(request)
  if (unauthorized) return unauthorized

  try {
    // Lister toutes les journées (pas de filtre par ligue)
    const journees = await listJourneesForAdmin(null)
    return NextResponse.json(journees)
  } catch (error) {
    console.error('Error fetching journees for admin:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const unauthorized = await ensureAdminAuth(request)
  if (unauthorized) return unauthorized

  try {
    const body = await request.json()
    // Permettre la création de journées pour n'importe quelle saison
    const journee = await createJourneeAdmin(body, null)
    await logAdminAction({ request, action: 'create', entityType: 'journee', entityId: journee.id })
    return NextResponse.json(journee)
  } catch (error) {
    console.error('Error creating journee:', error)
    return NextResponse.json(
      { error: safeErrorMessage(error) },
      { status: 400 }
    )
  }
}


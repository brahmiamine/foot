import { NextRequest, NextResponse } from 'next/server'
import { ensureInternalAuth } from '@/lib/internalAuth'
import { safeErrorMessage } from '@/lib/apiError'
import { updateMatchAdmin } from '@/lib/adminMatches'

export const runtime = 'nodejs'

const VALID_STATUSES = ['UPCOMING', 'IN_PROGRESS', 'FINISHED', 'CANCELLED']

/**
 * PATCH /api/internal/matches/[id]/status — appelée par matchsheet quand la
 * feuille de match démarre (IN_PROGRESS) ou se clôture (FINISHED). Avant
 * cet appel, `matches.status` ne bougeait jamais (aucune app ne l'écrivait).
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const unauthorized = ensureInternalAuth(request)
  if (unauthorized) return unauthorized

  try {
    const { id } = await params
    const body = await request.json()

    if (!VALID_STATUSES.includes(body.status)) {
      return NextResponse.json({ error: 'status invalide' }, { status: 400 })
    }

    const match = await updateMatchAdmin(id, { status: body.status }, null)
    return NextResponse.json(match)
  } catch (error) {
    console.error('Error updating match status via internal API:', error)
    return NextResponse.json({ error: safeErrorMessage(error) }, { status: 400 })
  }
}

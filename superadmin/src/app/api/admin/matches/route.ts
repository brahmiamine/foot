import { NextRequest, NextResponse } from 'next/server'
import { safeErrorMessage } from '@/lib/apiError'
import { ensureAdminAuth } from '@/lib/adminAuth'
import { listMatchesForAdmin, createMatchAdmin } from '@/lib/adminMatches'
import { logAdminAction } from '@/lib/auditLog'
import { ScheduleConflictError } from '@/lib/scheduleConflicts'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const unauthorized = await ensureAdminAuth(request)
  if (unauthorized) return unauthorized

  const { searchParams } = new URL(request.url)
  const limitParam = searchParams.get('limit')
  const journeeIdParam = searchParams.get('journeeId')
  const limit = limitParam ? Math.min(200, Math.max(1, Number(limitParam))) : 50
  const journeeId = journeeIdParam || null

  try {
    // Lister les matchs sans restriction de ligue
    const matches = await listMatchesForAdmin(limit, null, journeeId)
    return NextResponse.json(matches)
  } catch (error) {
    console.error('Error fetching admin matches:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const unauthorized = await ensureAdminAuth(request)
  if (unauthorized) return unauthorized

  try {
    const body = await request.json()
    // Créer le match sans restriction de ligue
    const { match, overriddenConflicts } = await createMatchAdmin(body, null)
    await logAdminAction({ request, action: 'create', entityType: 'match', entityId: match.id })
    if (overriddenConflicts.length > 0) {
      await logAdminAction({
        request,
        action: 'derogation',
        entityType: 'match',
        entityId: match.id,
        summary: `Conflit(s) de programmation outrepassé(s) : ${overriddenConflicts.map((c) => c.message).join(' ; ')} | Motif : ${body.derogation_reason ?? ''}`,
      })
    }
    return NextResponse.json(match)
  } catch (error) {
    console.error('Error creating match:', error)
    // Message métier sûr à exposer tel quel (liste des conflits détectés,
    // pas un détail interne) : le client peut proposer une dérogation motivée.
    if (error instanceof ScheduleConflictError) {
      return NextResponse.json({ error: error.message, conflicts: error.conflicts }, { status: 409 })
    }
    return NextResponse.json(
      { error: safeErrorMessage(error) },
      { status: 400 }
    )
  }
}



import { NextRequest, NextResponse } from 'next/server'
import { safeErrorMessage } from '@/lib/apiError'
import { ensureAdminAuth } from '@/lib/adminAuth'
import { getTeamById, updateTeamAdmin, deleteTeamAdmin } from '@/lib/adminTeams'
import { logAdminAction } from '@/lib/auditLog'

export const runtime = 'nodejs'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const unauthorized = await ensureAdminAuth(request)
  if (unauthorized) return unauthorized

  try {
    const { id } = await params
    const team = await getTeamById(id)
    
    if (!team) {
      return NextResponse.json({ error: 'Équipe introuvable' }, { status: 404 })
    }

    return NextResponse.json(team)
  } catch (error) {
    console.error('Error fetching team:', error)
    return NextResponse.json(
      { error: safeErrorMessage(error) },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const unauthorized = await ensureAdminAuth(request)
  if (unauthorized) return unauthorized

  try {
    const { id } = await params
    const body = await request.json()
    const team = await updateTeamAdmin(id, body)
    await logAdminAction({ request, action: 'update', entityType: 'team', entityId: id, summary: team.nom })
    return NextResponse.json(team)
  } catch (error) {
    console.error('Error updating team:', error)
    return NextResponse.json(
      { error: safeErrorMessage(error) },
      { status: 400 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const unauthorized = await ensureAdminAuth(request)
  if (unauthorized) return unauthorized

  try {
    const { id } = await params
    await deleteTeamAdmin(id)
    await logAdminAction({ request, action: 'delete', entityType: 'team', entityId: id })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting team:', error)
    return NextResponse.json(
      { error: safeErrorMessage(error) },
      { status: 400 }
    )
  }
}


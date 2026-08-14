import { NextRequest, NextResponse } from 'next/server'
import { safeErrorMessage } from '@/lib/apiError'
import { ensureAdminAuth } from '@/lib/adminAuth'
import { getTeamById } from '@/lib/adminTeams'
import { getTeamBranding, upsertTeamBranding } from '@/lib/adminTeamBranding'
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

    const branding = await getTeamBranding(id)
    return NextResponse.json(branding ?? { teamId: id })
  } catch (error) {
    console.error('Error fetching team branding:', error)
    return NextResponse.json({ error: safeErrorMessage(error) }, { status: 500 })
  }
}

export async function PUT(
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

    const body = await request.json()
    const branding = await upsertTeamBranding(id, {
      faviconUrl: body.faviconUrl,
      icon192Url: body.icon192Url,
      icon512Url: body.icon512Url,
      primaryColor: body.primaryColor,
      secondaryColor: body.secondaryColor,
      accentColor: body.accentColor,
      font: body.font,
      metadata: body.metadata,
    })
    await logAdminAction({ request, action: 'update', entityType: 'team_branding', entityId: id, summary: team.nom })
    return NextResponse.json(branding)
  } catch (error) {
    console.error('Error updating team branding:', error)
    return NextResponse.json({ error: safeErrorMessage(error) }, { status: 400 })
  }
}

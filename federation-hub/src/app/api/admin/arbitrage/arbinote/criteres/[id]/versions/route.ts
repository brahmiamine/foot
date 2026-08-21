import { NextRequest, NextResponse } from 'next/server'
import { ensureAdminAuth } from '@/lib/adminAuth'
import { listCritereVersions } from '@/lib/adminCriteres'

export const runtime = 'nodejs'

/** ARBI-004 — historique complet des versions d'un critère public (non-rétroactivité, audit). */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const unauthorized = await ensureAdminAuth(request)
  if (unauthorized) return unauthorized

  try {
    const { id } = await params
    return NextResponse.json(await listCritereVersions(id))
  } catch (error) {
    console.error('Error listing critere versions:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/adminAuth'
import { getDataSource } from '@/lib/db'

export const runtime = 'nodejs'

/** Sélecteur d'écran : stades du club (référentiel `cms_stadiums`, propriété club-hub), lecture seule. */
export async function GET(request: NextRequest) {
  const session = await getAdminSession(request)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const clubId = new URL(request.url).searchParams.get('clubId')
  if (!clubId) return NextResponse.json([])
  try {
    const dataSource = await getDataSource()
    const stadiums = await dataSource.query('SELECT id, name_fr AS nameFr FROM cms_stadiums WHERE team_id = ?', [clubId])
    return NextResponse.json(stadiums)
  } catch (error) {
    console.error('Error listing stadiums:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

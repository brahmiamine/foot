import { NextRequest, NextResponse } from 'next/server'
import { ACTIVE_LEAGUE_COOKIE } from '@/lib/leagueSelection'
import { getDataSource } from '@/lib/db'
import { League } from '@/lib/entities'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const { league_id } = await request.json()
    if (!league_id) {
      return NextResponse.json({ error: 'league_id is required' }, { status: 400 })
    }

    const dataSource = await getDataSource()
    const repo = dataSource.getRepository<League>('ligues')
    const league = await repo.findOne({ where: { id: league_id } })
    if (!league) {
      return NextResponse.json({ error: 'League not found' }, { status: 404 })
    }

    const response = NextResponse.json({ success: true })
    response.cookies.set({
      name: ACTIVE_LEAGUE_COOKIE,
      value: league_id,
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
    })
    return response
  } catch (error) {
    console.error('Failed to set league preference', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}



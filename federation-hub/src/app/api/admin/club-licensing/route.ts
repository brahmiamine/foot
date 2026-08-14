import { NextRequest, NextResponse } from 'next/server'
import { In } from 'typeorm'
import { getAdminSession } from '@/lib/adminAuth'
import { getDataSource } from '@/lib/db'
import { Team, Saison } from '@/lib/entities'
import { listClubLicenseApplications } from '@/lib/clubLicensing'
import { CLUB_LICENSE_STATUSES, type ClubLicenseStatus } from '../../../../../../packages/regulatory-shared/src/clubLicensing'
import { toPlain } from '@/lib/serialization'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const session = await getAdminSession(request)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const statusParam = searchParams.get('status')
  const status = statusParam && CLUB_LICENSE_STATUSES.includes(statusParam as ClubLicenseStatus)
    ? statusParam as ClubLicenseStatus
    : undefined

  try {
    const dataSource = await getDataSource()
    const applications = await listClubLicenseApplications(dataSource, session, {
      status,
      seasonId: searchParams.get('seasonId') || undefined,
      federationId: searchParams.get('federationId') || undefined,
      leagueId: searchParams.get('leagueId') || undefined,
      clubId: searchParams.get('clubId') || undefined,
    })
    const clubIds = [...new Set(applications.map((item) => item.clubId))]
    const seasonIds = [...new Set(applications.map((item) => item.seasonId))]
    const [clubs, seasons] = await Promise.all([
      clubIds.length ? dataSource.getRepository(Team).find({ where: { id: In(clubIds) } }) : [],
      seasonIds.length ? dataSource.getRepository(Saison).find({ where: { id: In(seasonIds) } }) : [],
    ])
    const clubNames = new Map(clubs.map((club) => [club.id, club.nom]))
    const seasonNames = new Map(seasons.map((season) => [season.id, season.nom]))
    return NextResponse.json(toPlain(applications.map((application) => ({
      ...application,
      clubName: clubNames.get(application.clubId) ?? application.clubId,
      seasonName: seasonNames.get(application.seasonId) ?? application.seasonId,
    }))))
  } catch (error) {
    console.error('Error listing club licence applications:', error)
    return NextResponse.json({ error: 'Erreur lors du chargement des dossiers' }, { status: 500 })
  }
}

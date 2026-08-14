import { NextRequest, NextResponse } from 'next/server'
import { safeErrorMessage } from '@/lib/apiError'
import { ensureAdminAuth, ensureAdminOrFederationAuth } from '@/lib/adminAuth'
import { listTeamsForAdmin, createTeamAdmin, getTeamsFilterOptions, TeamFilters } from '@/lib/adminTeams'
import type { TeamType, Sport, AgeCategory, Gender } from '@/types'
import { logAdminAction } from '@/lib/auditLog'

export const runtime = 'nodejs'

/** Lecture ouverte à FEDERATION_ADMIN (référentiel club, non sensible — sélecteurs des écrans affiliations/transferts). Écriture (POST ci-dessous) inchangée, PLATFORM_SUPERADMIN uniquement. */
export async function GET(request: NextRequest) {
  const unauthorized = await ensureAdminOrFederationAuth(request)
  if (unauthorized) return unauthorized

  try {
    const { searchParams } = new URL(request.url)

    // Si on demande les options de filtres
    if (searchParams.get('getFilterOptions') === 'true') {
      const options = await getTeamsFilterOptions()
      return NextResponse.json(options)
    }

    // Construire les filtres
    const filters: TeamFilters = {
      search: searchParams.get('search') || undefined,
    }

    const teamTypeParam = searchParams.get('team_type')
    if (teamTypeParam === 'club' || teamTypeParam === 'national') {
      filters.team_type = teamTypeParam
    } else if (teamTypeParam) {
      filters.team_type = 'all'
    }

    const sportParam = searchParams.get('sport')
    if (sportParam === 'football' || sportParam === 'handball' || sportParam === 'basketball' || sportParam === 'volleyball') {
      filters.sport = sportParam
    } else if (sportParam) {
      filters.sport = 'all'
    }

    const ageCategoryParam = searchParams.get('age_category')
    const validAgeCategories: AgeCategory[] = [
      'seniors',
      'u21', 'u20', 'u19', 'u18', 'u17', 'u16', 'u15', 'u14', 'u13',
      'u12', 'u11', 'u10', 'u9', 'u8', 'u7',
    ]
    if (ageCategoryParam && validAgeCategories.includes(ageCategoryParam as AgeCategory)) {
      filters.age_category = ageCategoryParam as AgeCategory
    } else if (ageCategoryParam) {
      filters.age_category = 'all'
    }

    const genderParam = searchParams.get('gender')
    if (genderParam === 'male' || genderParam === 'female' || genderParam === 'mixed') {
      filters.gender = genderParam as Gender
    } else if (genderParam) {
      filters.gender = 'all'
    }

    const countryCodeParam = searchParams.get('country_code')
    if (countryCodeParam && countryCodeParam !== 'all') {
      filters.country_code = countryCodeParam
    }

    const teams = await listTeamsForAdmin(filters)
    return NextResponse.json(teams)
  } catch (error) {
    console.error('Error fetching teams:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const unauthorized = await ensureAdminAuth(request)
  if (unauthorized) return unauthorized

  try {
    const body = await request.json()
    const team = await createTeamAdmin(body)
    await logAdminAction({ request, action: 'create', entityType: 'team', entityId: team.id, summary: team.nom })
    return NextResponse.json(team)
  } catch (error) {
    console.error('Error creating team:', error)
    return NextResponse.json(
      { error: safeErrorMessage(error) },
      { status: 400 }
    )
  }
}

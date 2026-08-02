import { NextRequest, NextResponse } from 'next/server'
import { safeErrorMessage } from '@/lib/apiError'
import { ensureAdminAuth } from '@/lib/adminAuth'
import { importTeamsFromJson } from '@/lib/adminTeams'
import { logAdminAction } from '@/lib/auditLog'

export const runtime = 'nodejs'

/**
 * POST /api/admin/teams/import
 * Import teams from JSON file
 * 
 * Expected JSON format:
 * {
 *   "teams": [
 *     {
 *       "nom": "Team Name",
 *       "nom_en": "Team Name (EN)",
 *       "nom_ar": "اسم الفريق",
 *       "abbr": "TN",
 *       "team_type": "club",
 *       "country_code": "TUN",
 *       "sport": "football",
 *       "age_category": "seniors",
 *       "city": "City",
 *       "stadium": "Stadium Name",
 *       "logo_url": "https://..."
 *     }
 *   ]
 * }
 */
export async function POST(request: NextRequest) {
  const unauthorized = ensureAdminAuth(request)
  if (unauthorized) return unauthorized

  try {
    const body = await request.json()
    
    if (!body.teams || !Array.isArray(body.teams)) {
      return NextResponse.json(
        { error: 'Format invalide. Le fichier doit contenir un tableau "teams".' },
        { status: 400 }
      )
    }

    if (body.teams.length === 0) {
      return NextResponse.json(
        { error: 'Le tableau "teams" est vide.' },
        { status: 400 }
      )
    }

    const result = await importTeamsFromJson(body.teams)
    await logAdminAction({ request, action: 'import', entityType: 'team', summary: `${body.teams.length} équipe(s) importée(s)` })
    return NextResponse.json(result)
  } catch (error) {
    console.error('Error importing teams:', error)
    return NextResponse.json(
      { error: safeErrorMessage(error, "Erreur lors de l'import") },
      { status: 400 }
    )
  }
}


import { NextRequest, NextResponse } from 'next/server'
import { safeErrorMessage } from '@/lib/apiError'
import { ensureAdminAuth } from '@/lib/adminAuth'
import { fetchMatchFacts } from '@/lib/dataAccess/matchFacts'

export const runtime = 'nodejs'

/**
 * Fil chronologique des faits de match (buts, cartons, blessures,
 * remplacements) saisis dans la feuille de match électronique (`match-operations`).
 * Lecture seule — voir db/OWNERSHIP.md.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const unauthorized = await ensureAdminAuth(request)
  if (unauthorized) return unauthorized

  try {
    const { id } = await params
    const facts = await fetchMatchFacts(id)
    return NextResponse.json({ facts })
  } catch (error) {
    console.error('Error fetching match facts:', error)
    return NextResponse.json(
      { error: safeErrorMessage(error) },
      { status: 400 }
    )
  }
}

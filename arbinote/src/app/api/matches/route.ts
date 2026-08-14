import { NextResponse } from 'next/server'
import { fetchMatches } from '@/lib/dataAccess'
import { enforcePublicRateLimit } from '@/lib/publicRateLimit'

export async function GET(request: Request) {
  const limited = enforcePublicRateLimit(request, 'matches')
  if (limited) return limited

  try {
    const { searchParams } = new URL(request.url)
    const limitParam = Number(searchParams.get('limit'))
    const offsetParam = Number(searchParams.get('offset'))
    const q = searchParams.get('q')?.trim() || undefined
    // Comportement par défaut inchangé (limit=100, offset=0) si aucun paramètre fourni.
    const limit = Number.isFinite(limitParam) && limitParam > 0 ? limitParam : 100
    const offset = Number.isFinite(offsetParam) && offsetParam >= 0 ? offsetParam : 0

    const { rows, total } = await fetchMatches(limit, undefined, offset, q)
    return NextResponse.json({ items: rows, total, limit, offset })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}


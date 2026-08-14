import { NextResponse } from 'next/server'
import { fetchArbitres } from '@/lib/dataAccess'
import { enforcePublicRateLimit } from '@/lib/publicRateLimit'

export async function GET(request: Request) {
  const limited = enforcePublicRateLimit(request, 'arbitres')
  if (limited) return limited

  try {
    const { searchParams } = new URL(request.url)
    const limitParam = Number(searchParams.get('limit'))
    const offsetParam = Number(searchParams.get('offset'))
    const q = searchParams.get('q')?.trim() || undefined
    // Sans paramètres : comportement inchangé (liste complète).
    // offset n'a de sens qu'accompagné d'une limite (OFFSET seul n'est pas supporté en SQL).
    const limit = Number.isFinite(limitParam) && limitParam > 0 ? limitParam : undefined
    const offset =
      limit !== undefined && Number.isFinite(offsetParam) && offsetParam >= 0 ? offsetParam : undefined

    const { rows, total } = await fetchArbitres(limit, offset, q)
    return NextResponse.json({ items: rows, total, limit: limit ?? total, offset: offset ?? 0 })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}


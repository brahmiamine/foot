import { NextRequest, NextResponse } from 'next/server'
import { RegulatoryEligibilityService } from '@/domain/regulatory/RegulatoryEligibilityService'
import { ensureFederationServiceAuth } from '@/lib/serviceAuth'
import type { HeadCoachQualificationCheckRequest } from '../../../../../../../../packages/domain-contracts/src/staff-eligibility'

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function parseBody(value: unknown): HeadCoachQualificationCheckRequest | null {
  if (!value || typeof value !== 'object') return null
  const body = value as Record<string, unknown>
  if (
    !isNonEmptyString(body.staffId) ||
    !isNonEmptyString(body.clubId) ||
    !isNonEmptyString(body.seasonId) ||
    !isNonEmptyString(body.matchDate)
  ) {
    return null
  }

  const matchDate = new Date(body.matchDate)
  if (Number.isNaN(matchDate.getTime())) return null

  return {
    staffId: body.staffId,
    clubId: body.clubId,
    seasonId: body.seasonId,
    matchDate: matchDate.toISOString(),
  }
}

export async function POST(request: NextRequest) {
  const authError = ensureFederationServiceAuth(request)
  if (authError) return authError

  const parsed = parseBody(await request.json().catch(() => null))
  if (!parsed) {
    return NextResponse.json({ error: 'Invalid head-coach eligibility request' }, { status: 400 })
  }

  try {
    const result = await new RegulatoryEligibilityService().checkHeadCoachQualification(parsed)
    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Head-coach eligibility check failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

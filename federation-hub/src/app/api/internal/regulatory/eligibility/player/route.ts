import { NextRequest, NextResponse } from 'next/server'
import { RegulatoryEligibilityService } from '@/domain/regulatory/RegulatoryEligibilityService'
import { ensureFederationServiceAuth } from '@/lib/serviceAuth'
import type {
  EligibilityCheckRequest,
  EligibilityContext,
} from '../../../../../../../../packages/domain-contracts/src/eligibility'

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function parseBody(value: unknown): {
  input: EligibilityCheckRequest
  context: EligibilityContext
} | null {
  if (!value || typeof value !== 'object') return null
  const body = value as { input?: unknown; context?: unknown }
  if (!body.input || typeof body.input !== 'object') return null
  const input = body.input as Record<string, unknown>
  if (
    !isNonEmptyString(input.playerId) ||
    !isNonEmptyString(input.clubId) ||
    !isNonEmptyString(input.matchId)
  ) {
    return null
  }

  const context = body.context && typeof body.context === 'object'
    ? body.context as EligibilityContext
    : {}

  return {
    input: {
      playerId: input.playerId,
      clubId: input.clubId,
      matchId: input.matchId,
      seasonId: isNonEmptyString(input.seasonId) ? input.seasonId : undefined,
    },
    context,
  }
}

export async function POST(request: NextRequest) {
  const authError = ensureFederationServiceAuth(request)
  if (authError) return authError

  const parsed = parseBody(await request.json().catch(() => null))
  if (!parsed) {
    return NextResponse.json({ error: 'Invalid eligibility request' }, { status: 400 })
  }

  try {
    const result = await new RegulatoryEligibilityService().checkPlayerEligibility(
      parsed.input,
      parsed.context,
    )
    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Eligibility check failed'
    const status = message === 'Match introuvable' || message === 'Saison du match introuvable' ? 404 : 500
    return NextResponse.json({ error: message }, { status })
  }
}

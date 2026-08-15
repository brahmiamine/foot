import { NextRequest, NextResponse } from 'next/server'
import { ensureRefereeServiceAuth } from '@/lib/serviceAuth'
import { AvailabilityError, AvailabilityService } from '@/services/AvailabilityService'

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/
const MAX_BATCH_SIZE = 500

export async function POST(request: NextRequest) {
  const authError = ensureRefereeServiceAuth(request)
  if (authError) return authError

  const body = (await request.json().catch(() => null)) as
    | { userIds?: unknown; date?: unknown }
    | null

  if (
    !Array.isArray(body?.userIds) ||
    body.userIds.some((id) => typeof id !== 'string' || !id.trim()) ||
    body.userIds.length > MAX_BATCH_SIZE ||
    typeof body.date !== 'string' ||
    !ISO_DATE.test(body.date)
  ) {
    return NextResponse.json(
      { error: `userIds (max ${MAX_BATCH_SIZE}) and date (YYYY-MM-DD) are required` },
      { status: 400 },
    )
  }

  try {
    const result = await new AvailabilityService().checkAvailabilityBatch({
      userIds: body.userIds as string[],
      date: body.date,
    })
    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof AvailabilityError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    console.error('[referee-hub] batch availability check failed', error)
    return NextResponse.json({ error: 'Availability check failed' }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { ensureRefereeServiceAuth } from '@/lib/serviceAuth'
import { AvailabilityError, AvailabilityService } from '@/services/AvailabilityService'

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

export async function POST(request: NextRequest) {
  const authError = ensureRefereeServiceAuth(request)
  if (authError) return authError

  const body = (await request.json().catch(() => null)) as
    | { userId?: unknown; date?: unknown }
    | null

  if (
    typeof body?.userId !== 'string' ||
    !body.userId.trim() ||
    typeof body.date !== 'string' ||
    !ISO_DATE.test(body.date)
  ) {
    return NextResponse.json(
      { error: 'userId and date (YYYY-MM-DD) are required' },
      { status: 400 },
    )
  }

  try {
    const result = await new AvailabilityService().checkAvailability({
      userId: body.userId.trim(),
      date: body.date,
    })
    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof AvailabilityError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    console.error('[referee-hub] availability check failed', error)
    return NextResponse.json({ error: 'Availability check failed' }, { status: 500 })
  }
}

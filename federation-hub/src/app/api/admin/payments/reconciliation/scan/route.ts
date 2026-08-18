import { NextRequest, NextResponse } from 'next/server'
import { scanPaymentReconciliation } from '@/lib/paymentReconciliationClient'
import { getOperatorRequestContext, getPlatformPaymentAdminSession } from '@/lib/platformPaymentAdmin'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  const session = await getPlatformPaymentAdminSession(request)
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  try {
    return NextResponse.json(
      await scanPaymentReconciliation(getOperatorRequestContext(request, session.id)),
    )
  } catch (error) {
    console.error('Error scanning payment reconciliation:', error)
    return NextResponse.json({ error: 'Impossible de lancer la réconciliation.' }, { status: 502 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { listPaymentReconciliationCases, type PaymentReconciliationCaseStatus } from '@/lib/paymentReconciliationClient'
import { getPlatformPaymentAdminSession } from '@/lib/platformPaymentAdmin'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const session = await getPlatformPaymentAdminSession(request)
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const status = request.nextUrl.searchParams.get('status')
  const provider = request.nextUrl.searchParams.get('provider')
  const consumerApplication = request.nextUrl.searchParams.get('consumerApplication')
  try {
    const cases = await listPaymentReconciliationCases({
      status: status === 'RESOLVED' ? 'RESOLVED' : ('OPEN' as PaymentReconciliationCaseStatus),
      provider:
        provider === 'konnect' || provider === 'paymee' || provider === 'flouci'
          ? provider
          : undefined,
      consumerApplication: consumerApplication || undefined,
      limit: 300,
    })
    return NextResponse.json(cases)
  } catch (error) {
    console.error('Error loading payment reconciliation queue:', error)
    return NextResponse.json({ error: 'Impossible de charger la réconciliation des paiements.' }, { status: 502 })
  }
}

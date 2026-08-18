import { NextRequest, NextResponse } from 'next/server'
import { getPaymentReconciliationCase } from '@/lib/paymentReconciliationClient'
import { getPlatformPaymentAdminSession } from '@/lib/platformPaymentAdmin'

export const runtime = 'nodejs'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getPlatformPaymentAdminSession(request)
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await params
  try {
    return NextResponse.json(await getPaymentReconciliationCase(id))
  } catch (error) {
    console.error('Error loading payment reconciliation case:', error)
    return NextResponse.json({ error: 'Impossible de charger le dossier de réconciliation.' }, { status: 502 })
  }
}

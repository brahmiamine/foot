import { NextRequest, NextResponse } from 'next/server'
import {
  recheckPaymentReconciliationCase,
  resolvePaymentReconciliationCase,
  type PaymentReconciliationResolutionAction,
} from '@/lib/paymentReconciliationClient'
import {
  getOperatorRequestContext,
  getPlatformPaymentAdminSession,
} from '@/lib/platformPaymentAdmin'

export const runtime = 'nodejs'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; action: string }> },
) {
  const session = await getPlatformPaymentAdminSession(request)
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { id, action } = await params
  const operator = getOperatorRequestContext(request, session.id)

  try {
    if (action === 'recheck') {
      return NextResponse.json(await recheckPaymentReconciliationCase(id, operator))
    }
    if (action !== 'resolve') {
      return NextResponse.json({ error: 'Action inconnue.' }, { status: 404 })
    }

    const body = (await request.json()) as {
      action?: PaymentReconciliationResolutionAction
      note?: string
    }
    const note = body.note?.trim()
    if (
      (body.action !== 'ACCEPT_INTERNAL' && body.action !== 'DOCUMENT_EXCEPTION') ||
      !note ||
      note.length < 3 ||
      note.length > 2000
    ) {
      return NextResponse.json({ error: 'Résolution ou motif invalide.' }, { status: 400 })
    }

    return NextResponse.json(
      await resolvePaymentReconciliationCase(id, body.action, note, operator),
    )
  } catch (error) {
    console.error('Error applying payment reconciliation action:', error)
    return NextResponse.json({ error: 'Impossible de traiter le dossier de réconciliation.' }, { status: 502 })
  }
}

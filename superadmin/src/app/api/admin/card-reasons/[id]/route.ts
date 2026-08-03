import { NextRequest, NextResponse } from 'next/server'
import { safeErrorMessage } from '@/lib/apiError'
import { ensureAdminAuth } from '@/lib/adminAuth'
import { getDataSource } from '@/lib/db'
import { CardReason, type CardReasonType } from '@/lib/entities'
import { toPlain } from '@/lib/serialization'
import { logAdminAction } from '@/lib/auditLog'

export const runtime = 'nodejs'

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const unauthorized = ensureAdminAuth(request)
  if (unauthorized) return unauthorized

  try {
    const { id } = await params
    const body = await request.json()
    const { labelFr, labelAr, type, isActive } = body as {
      labelFr?: string
      labelAr?: string | null
      type?: CardReasonType
      isActive?: boolean
    }

    if (!labelFr || !type) {
      return NextResponse.json({ error: 'Le libellé (FR) et le type sont requis' }, { status: 400 })
    }
    if (!['YELLOW', 'RED', 'BOTH'].includes(type)) {
      return NextResponse.json({ error: 'Type de motif invalide' }, { status: 400 })
    }

    const dataSource = await getDataSource()
    const repo = dataSource.getRepository<CardReason>('CardReason')
    const reason = await repo.findOne({ where: { id } })

    if (!reason) {
      return NextResponse.json({ error: 'Motif non trouvé' }, { status: 404 })
    }

    reason.labelFr = labelFr
    reason.labelAr = labelAr || null
    reason.type = type
    if (isActive !== undefined) reason.isActive = isActive

    const saved = await repo.save(reason)
    await logAdminAction({ request, action: 'update', entityType: 'card_reason', entityId: id, summary: saved.labelFr })
    return NextResponse.json(toPlain(saved))
  } catch (error) {
    console.error('Error updating card reason:', error)
    return NextResponse.json({ error: safeErrorMessage(error) }, { status: 400 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const unauthorized = ensureAdminAuth(request)
  if (unauthorized) return unauthorized

  try {
    const { id } = await params

    const dataSource = await getDataSource()
    const repo = dataSource.getRepository<CardReason>('CardReason')
    const reason = await repo.findOne({ where: { id } })

    if (!reason) {
      return NextResponse.json({ error: 'Motif non trouvé' }, { status: 404 })
    }

    await repo.remove(reason)
    await logAdminAction({ request, action: 'delete', entityType: 'card_reason', entityId: id, summary: reason.labelFr })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting card reason:', error)
    return NextResponse.json({ error: safeErrorMessage(error) }, { status: 400 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'node:crypto'
import { safeErrorMessage } from '@/lib/apiError'
import { ensureAdminAuth } from '@/lib/adminAuth'
import { getDataSource } from '@/lib/db'
import { CardReason, type CardReasonType } from '@/lib/entities'
import { toPlain } from '@/lib/serialization'
import { logAdminAction } from '@/lib/auditLog'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const unauthorized = await ensureAdminAuth(request)
  if (unauthorized) return unauthorized

  try {
    const dataSource = await getDataSource()
    const repo = dataSource.getRepository<CardReason>('CardReason')
    const reasons = await repo.find({ order: { labelFr: 'ASC' } })
    return NextResponse.json(toPlain(reasons))
  } catch (error) {
    console.error('Error fetching card reasons:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const unauthorized = await ensureAdminAuth(request)
  if (unauthorized) return unauthorized

  try {
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

    const reason = repo.create({
      id: randomUUID(),
      labelFr,
      labelAr: labelAr || null,
      type,
      isActive: isActive ?? true,
    })
    const saved = await repo.save(reason)
    await logAdminAction({ request, action: 'create', entityType: 'card_reason', entityId: saved.id, summary: saved.labelFr })
    return NextResponse.json(toPlain(saved), { status: 201 })
  } catch (error) {
    console.error('Error creating card reason:', error)
    return NextResponse.json({ error: safeErrorMessage(error) }, { status: 400 })
  }
}

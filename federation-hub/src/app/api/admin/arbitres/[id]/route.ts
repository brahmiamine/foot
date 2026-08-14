import { NextRequest, NextResponse } from 'next/server'
import { safeErrorMessage } from '@/lib/apiError'
import { ensureAdminAuth } from '@/lib/adminAuth'
import { ArbitreInput, updateArbitre } from '@/lib/adminArbitres'
import { getDataSource } from '@/lib/db'
import { Arbitre } from '@/lib/entities'
import { logAdminAction } from '@/lib/auditLog'

export const runtime = 'nodejs'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const unauthorized = await ensureAdminAuth(request)
  if (unauthorized) return unauthorized

  try {
    const { id } = await params
    const payload = (await request.json()) as ArbitreInput
    const arbitre = await updateArbitre(id, payload)
    await logAdminAction({ request, action: 'update', entityType: 'arbitre', entityId: id, summary: arbitre.nom })
    return NextResponse.json(arbitre)
  } catch (error) {
    console.error('Error updating arbitre:', error)
    return NextResponse.json(
      { error: safeErrorMessage(error) },
      { status: 400 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const unauthorized = await ensureAdminAuth(request)
  if (unauthorized) return unauthorized

  try {
    const { id } = await params
    const dataSource = await getDataSource()
    const repo = dataSource.getRepository<Arbitre>('arbitres')
    const arbitre = await repo.findOne({ where: { id } })

    if (!arbitre) {
      return NextResponse.json({ error: 'Arbitre non trouvé' }, { status: 404 })
    }

    await repo.remove(arbitre)
    await logAdminAction({ request, action: 'delete', entityType: 'arbitre', entityId: id, summary: arbitre.nom })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting arbitre:', error)
    return NextResponse.json(
      { error: safeErrorMessage(error) },
      { status: 400 }
    )
  }
}



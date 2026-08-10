import { NextRequest, NextResponse } from 'next/server'
import { safeErrorMessage } from '@/lib/apiError'
import { ensureAdminAuth } from '@/lib/adminAuth'
import { getDataSource } from '@/lib/db'
import { Federation } from '@/lib/entities'
import { toPlain } from '@/lib/serialization'
import { logAdminAction } from '@/lib/auditLog'

export const runtime = 'nodejs'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const unauthorized = await ensureAdminAuth(request)
  if (unauthorized) return unauthorized

  try {
    const { id } = await params

    const dataSource = await getDataSource()
    const repo = dataSource.getRepository<Federation>('federations')
    const federation = await repo.findOne({ where: { id } })

    if (!federation) {
      return NextResponse.json({ error: 'Fédération non trouvée' }, { status: 404 })
    }

    return NextResponse.json(toPlain(federation))
  } catch (error) {
    console.error('Error fetching federation:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const unauthorized = await ensureAdminAuth(request)
  if (unauthorized) return unauthorized

  try {
    const { id } = await params
    const body = await request.json()
    const { code, nom, nom_en, nom_ar, logo_url } = body

    if (!code || !nom) {
      return NextResponse.json(
        { error: 'Code et nom sont requis' },
        { status: 400 }
      )
    }

    const dataSource = await getDataSource()
    const repo = dataSource.getRepository<Federation>('federations')
    const federation = await repo.findOne({ where: { id } })

    if (!federation) {
      return NextResponse.json({ error: 'Fédération non trouvée' }, { status: 404 })
    }

    // Vérifier si le code existe déjà pour une autre fédération
    if (code !== federation.code) {
      const existing = await repo.findOne({ where: { code } })
      if (existing) {
        return NextResponse.json(
          { error: 'Une fédération avec ce code existe déjà' },
          { status: 400 }
        )
      }
    }

    federation.code = code
    federation.nom = nom
    federation.nom_en = nom_en || null
    federation.nom_ar = nom_ar || null
    federation.logo_url = logo_url || null

    const saved = await repo.save(federation)
    await logAdminAction({ request, action: 'update', entityType: 'federation', entityId: id, summary: saved.nom })
    return NextResponse.json(toPlain(saved))
  } catch (error) {
    console.error('Error updating federation:', error)
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
    const repo = dataSource.getRepository<Federation>('federations')
    const federation = await repo.findOne({ where: { id } })

    if (!federation) {
      return NextResponse.json({ error: 'Fédération non trouvée' }, { status: 404 })
    }

    await repo.remove(federation)
    await logAdminAction({ request, action: 'delete', entityType: 'federation', entityId: id, summary: federation.nom })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting federation:', error)
    return NextResponse.json(
      { error: safeErrorMessage(error) },
      { status: 400 }
    )
  }
}


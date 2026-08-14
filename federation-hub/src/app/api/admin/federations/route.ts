import { NextRequest, NextResponse } from 'next/server'
import { safeErrorMessage } from '@/lib/apiError'
import { ensureAdminAuth, ensureAdminOrFederationAuth, getAdminSession } from '@/lib/adminAuth'
import { getDataSource } from '@/lib/db'
import { Federation } from '@/lib/entities'
import { toPlain } from '@/lib/serialization'
import { logAdminAction } from '@/lib/auditLog'

export const runtime = 'nodejs'

/**
 * Lecture ouverte à `FEDERATION_ADMIN` (données de référence, rien de
 * sensible) — filtrée à sa propre fédération, jamais la liste complète.
 * L'écriture (POST ci-dessous, création d'une fédération) reste
 * `PLATFORM_SUPERADMIN` uniquement.
 */
export async function GET(request: NextRequest) {
  const unauthorized = await ensureAdminOrFederationAuth(request)
  if (unauthorized) return unauthorized

  try {
    const session = await getAdminSession(request)
    const dataSource = await getDataSource()
    const repo = dataSource.getRepository<Federation>('federations')
    const federations = await repo.find({
      where: session?.role === 'FEDERATION_ADMIN' && session.federationId ? { id: session.federationId } : {},
      order: { nom: 'ASC' },
    })
    return NextResponse.json(toPlain(federations))
  } catch (error) {
    console.error('Error fetching federations:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const unauthorized = await ensureAdminAuth(request)
  if (unauthorized) return unauthorized

  try {
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
    
    // Vérifier si le code existe déjà
    const existing = await repo.findOne({ where: { code } })
    if (existing) {
      return NextResponse.json(
        { error: 'Une fédération avec ce code existe déjà' },
        { status: 400 }
      )
    }

    const federation = repo.create({
      code,
      nom,
      nom_en: nom_en || null,
      nom_ar: nom_ar || null,
      logo_url: logo_url || null,
      is_active: true, // Par défaut, une nouvelle fédération est active
    })
    const saved = await repo.save(federation)
    await logAdminAction({ request, action: 'create', entityType: 'federation', entityId: saved.id, summary: saved.nom })
    return NextResponse.json(toPlain(saved), { status: 201 })
  } catch (error) {
    console.error('Error creating federation:', error)
    return NextResponse.json(
      { error: safeErrorMessage(error) },
      { status: 400 }
    )
  }
}


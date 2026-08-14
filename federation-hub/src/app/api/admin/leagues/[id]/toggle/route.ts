import { NextRequest, NextResponse } from 'next/server'
import { ensureAdminAuth } from '@/lib/adminAuth'
import { getDataSource } from '@/lib/db'
import { League } from '@/lib/entities'
import { toPlain } from '@/lib/serialization'
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
    const { is_active } = await request.json()

    if (typeof is_active !== 'boolean') {
      return NextResponse.json(
        { error: 'is_active doit être un booléen' },
        { status: 400 }
      )
    }

    const dataSource = await getDataSource()
    const repo = dataSource.getRepository<League>('ligues')
    const federationRepo = dataSource.getRepository('federations')
    
    const league = await repo.findOne({ where: { id } })
    if (!league) {
      return NextResponse.json({ error: 'Ligue non trouvée' }, { status: 404 })
    }

    // Si on essaie d'activer une ligue, vérifier que sa fédération est active
    if (is_active) {
      const federation = await federationRepo.findOne({ where: { id: league.federation_id } })
      if (!federation) {
        return NextResponse.json(
          { error: 'Fédération non trouvée' },
          { status: 404 }
        )
      }
      if (!federation.is_active) {
        return NextResponse.json(
          { error: 'Impossible d\'activer une ligue dont la fédération est désactivée' },
          { status: 400 }
        )
      }
    }

    // Sauvegarder la nouvelle valeur avec une requête SQL directe pour garantir la sauvegarde
    console.log('Updating league:', id, 'is_active from', league.is_active, 'to', is_active)
    
    // Utiliser une requête SQL UPDATE directe pour s'assurer que la valeur est bien sauvegardée
    await dataSource.query(
      'UPDATE ligues SET is_active = ? WHERE id = ?',
      [is_active ? 1 : 0, id]
    )
    
    // Relire depuis la base pour confirmer avec une requête SQL directe
    const [updated] = await dataSource.query(
      'SELECT id, federation_id, nom, nom_en, nom_ar, logo_url, is_active, created_at FROM ligues WHERE id = ?',
      [id]
    )
    
    if (!updated) {
      return NextResponse.json({ error: 'Ligue non trouvée après mise à jour' }, { status: 404 })
    }
    
    // Convertir la valeur booléenne depuis MySQL
    const isActiveValue = updated.is_active === 1 || updated.is_active === true || updated.is_active === '1'
    console.log('Final league from DB, is_active raw:', updated.is_active, 'converted:', isActiveValue)
    
    const finalLeague = {
      id: updated.id,
      federation_id: updated.federation_id,
      nom: updated.nom,
      nom_en: updated.nom_en,
      nom_ar: updated.nom_ar,
      logo_url: updated.logo_url,
      is_active: isActiveValue,
      created_at: updated.created_at,
    }

    await logAdminAction({
      request,
      action: 'toggle',
      entityType: 'league',
      entityId: id,
      summary: `${finalLeague.nom} → ${isActiveValue ? 'activée' : 'désactivée'}`,
    })

    return NextResponse.json({
      success: true,
      league: finalLeague,
      is_active: isActiveValue
    })
  } catch (error) {
    console.error('Error toggling league:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}


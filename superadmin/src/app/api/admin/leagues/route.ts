import { NextRequest, NextResponse } from 'next/server'
import { safeErrorMessage } from '@/lib/apiError'
import { ensureAdminAuth } from '@/lib/adminAuth'
import { getDataSource } from '@/lib/db'
import { League } from '@/lib/entities'
import { toPlain } from '@/lib/serialization'
import { logAdminAction } from '@/lib/auditLog'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const unauthorized = ensureAdminAuth(request)
  if (unauthorized) return unauthorized

  try {
    const dataSource = await getDataSource()
    // Utiliser une requête SQL directe pour éviter les problèmes de métadonnées TypeORM
    // Ne pas utiliser COALESCE pour récupérer la vraie valeur de la base de données
    const leagues = await dataSource.query(`
      SELECT 
        l.id,
        l.federation_id,
        l.nom,
        l.nom_en,
        l.nom_ar,
        l.logo_url,
        l.is_active,
        l.created_at,
        f.id as federation_id_ref,
        f.nom as federation_nom,
        f.code as federation_code
      FROM ligues l
      LEFT JOIN federations f ON l.federation_id = f.id
      ORDER BY l.nom ASC
    `)
    
    // Transformer les résultats pour correspondre au format attendu
    const formattedLeagues = leagues.map((row: any) => {
      // Gérer correctement la conversion booléenne depuis MySQL
      // MySQL retourne 0/1 ou true/false selon la version
      let isActive: boolean
      if (row.is_active === null || row.is_active === undefined) {
        // Si la colonne n'existe pas ou est NULL, utiliser true par défaut
        isActive = true
      } else if (typeof row.is_active === 'boolean') {
        isActive = row.is_active
      } else if (typeof row.is_active === 'number') {
        isActive = row.is_active !== 0
      } else if (typeof row.is_active === 'string') {
        isActive = row.is_active === '1' || row.is_active === 'true' || row.is_active === 'TRUE'
      } else {
        isActive = Boolean(row.is_active)
      }
      
      return {
        id: row.id,
        federation_id: row.federation_id,
        nom: row.nom,
        nom_en: row.nom_en,
        nom_ar: row.nom_ar,
        logo_url: row.logo_url,
        is_active: isActive,
        created_at: row.created_at,
        federation: row.federation_id_ref ? {
          id: row.federation_id_ref,
          nom: row.federation_nom,
          code: row.federation_code,
        } : undefined,
      }
    })
    
    return NextResponse.json(formattedLeagues)
  } catch (error) {
    console.error('Error fetching leagues:', error)
    // Si l'erreur est due à une colonne manquante, retourner les ligues avec is_active = true par défaut
    if (error instanceof Error && error.message.includes('is_active')) {
      console.warn('Column is_active might not exist, trying without it...')
      try {
        const dataSource = await getDataSource()
        const leagues = await dataSource.query(`
          SELECT 
            l.id,
            l.federation_id,
            l.nom,
            l.nom_en,
            l.nom_ar,
            l.logo_url,
            l.created_at,
            f.id as federation_id_ref,
            f.nom as federation_nom,
            f.code as federation_code
          FROM ligues l
          LEFT JOIN federations f ON l.federation_id = f.id
          ORDER BY l.nom ASC
        `)
        const formattedLeagues = leagues.map((row: any) => ({
          ...row,
          is_active: true, // Par défaut si la colonne n'existe pas
          federation: row.federation_id_ref ? {
            id: row.federation_id_ref,
            nom: row.federation_nom,
            code: row.federation_code,
          } : undefined,
        }))
        return NextResponse.json(formattedLeagues)
      } catch (fallbackError) {
        console.error('Fallback query also failed:', fallbackError)
      }
    }
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const unauthorized = ensureAdminAuth(request)
  if (unauthorized) return unauthorized

  try {
    const body = await request.json()
    const { federation_id, nom, nom_en, nom_ar, logo_url } = body

    if (!federation_id || !nom) {
      return NextResponse.json(
        { error: 'Fédération et nom sont requis' },
        { status: 400 }
      )
    }

    const dataSource = await getDataSource()
    const federationRepo = dataSource.getRepository('federations')
    const leagueRepo = dataSource.getRepository<League>('ligues')
    
    // Vérifier que la fédération existe
    const federation = await federationRepo.findOne({ where: { id: federation_id } })
    if (!federation) {
      return NextResponse.json(
        { error: 'Fédération non trouvée' },
        { status: 400 }
      )
    }

    const league = leagueRepo.create({
      federation_id,
      nom,
      nom_en: nom_en || null,
      nom_ar: nom_ar || null,
      logo_url: logo_url || null,
      is_active: true, // Par défaut, une nouvelle ligue est active
    })
    const saved = await leagueRepo.save(league)
    await logAdminAction({ request, action: 'create', entityType: 'league', entityId: saved.id, summary: saved.nom })
    return NextResponse.json(toPlain(saved), { status: 201 })
  } catch (error) {
    console.error('Error creating league:', error)
    return NextResponse.json(
      { error: safeErrorMessage(error) },
      { status: 400 }
    )
  }
}


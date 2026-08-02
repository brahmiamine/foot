import { getDataSource } from './db'
import { Saison } from './entities'
import { toPlain, toPlainArray } from './serialization'

export interface SaisonCreateInput {
  nom: string
  type_competition: 'championnat' | 'coupe' | 'tournois'
  date_debut?: string | null
  date_fin?: string | null
  league_id?: string | null
}

export interface SaisonUpdateInput {
  nom?: string
  type_competition?: 'championnat' | 'coupe' | 'tournois'
  date_debut?: string | null
  date_fin?: string | null
  league_id?: string | null
}

function parseDate(value?: string | null) {
  if (!value) return null
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return null
  }
  return parsed
}

export async function listSaisonsForAdmin(leagueId?: string | null) {
  const dataSource = await getDataSource()
  const repo = dataSource.getRepository<Saison>('saisons')
  const rows = await repo.find({
    where: leagueId ? { league_id: leagueId } : undefined,
    order: { date_debut: 'ASC' },
    relations: {
      league: true,
    },
  })
  return toPlainArray(rows)
}

export async function createSaisonAdmin(payload: SaisonCreateInput, leagueId?: string | null) {
  const dataSource = await getDataSource()
  const repo = dataSource.getRepository<Saison>('saisons')

  // Vérifier que la ligue existe si elle est fournie
  if (payload.league_id) {
    const leagueRepo = dataSource.getRepository('ligues')
    const league = await leagueRepo.findOne({
      where: { id: payload.league_id },
    })

    if (!league) {
      throw new Error('Ligue introuvable')
    }
    // Permettre la création de saisons pour n'importe quelle ligue
  } else if (leagueId) {
    // Si aucune ligue n'est fournie mais qu'une ligue est active, l'utiliser par défaut
    payload.league_id = leagueId
  }

  // Vérifier l'unicité du nom pour cette ligue
  const whereClause: any = {
    nom: payload.nom,
  }
  if (payload.league_id) {
    whereClause.league_id = payload.league_id
  } else {
    whereClause.league_id = null
  }
  const existing = await repo.findOne({
    where: whereClause,
  })

  if (existing) {
    throw new Error(`Une saison avec le nom "${payload.nom}" existe déjà pour cette ligue`)
  }

  // Créer la nouvelle saison
  const newSaisonData: Partial<Saison> = {
    nom: payload.nom,
    type_competition: payload.type_competition,
    date_debut: parseDate(payload.date_debut) as any,
    date_fin: parseDate(payload.date_fin) as any,
    league_id: payload.league_id || null,
  }
  const newSaison = repo.create(newSaisonData)
  const saved = await repo.save(newSaison)

  // Recharger avec les relations
  const saison = await repo.findOne({
    where: { id: saved.id },
    relations: {
      league: true,
    },
  })

  if (!saison) {
    throw new Error('Erreur lors de la création de la saison')
  }

  return toPlain(saison)
}

export async function updateSaisonAdmin(id: string, payload: SaisonUpdateInput, leagueId?: string | null) {
  const dataSource = await getDataSource()
  const repo = dataSource.getRepository<Saison>('saisons')
  const saison = await repo.findOne({
    where: { id },
    relations: {
      league: true,
    },
  })

  if (!saison) {
    throw new Error('Saison introuvable')
  }

  // Vérifier la ligue si elle est modifiée
  if (payload.league_id !== undefined && payload.league_id !== saison.league_id) {
    if (payload.league_id) {
      const leagueRepo = dataSource.getRepository('ligues')
      const newLeague = await leagueRepo.findOne({
        where: { id: payload.league_id },
      })

      if (!newLeague) {
        throw new Error('Ligue introuvable')
      }
      // Permettre le changement de ligue pour n'importe quelle ligue
    }
  }

  // Vérifier l'unicité du nom si modifié
  if (payload.nom !== undefined && payload.nom !== saison.nom) {
    const targetLeagueId = payload.league_id !== undefined ? payload.league_id : saison.league_id
    const whereClause: any = {
      nom: payload.nom,
    }
    if (targetLeagueId) {
      whereClause.league_id = targetLeagueId
    } else {
      whereClause.league_id = null
    }
    const existing = await repo.findOne({
      where: whereClause,
    })

    if (existing && existing.id !== id) {
      throw new Error(`Une saison avec le nom "${payload.nom}" existe déjà pour cette ligue`)
    }
  }

  // Construire l'objet de mise à jour
  const updateData: Partial<Saison> = {}
  
  if (payload.nom !== undefined) {
    updateData.nom = payload.nom
  }
  
  if (payload.type_competition !== undefined) {
    updateData.type_competition = payload.type_competition
  }
  
  if (payload.date_debut !== undefined) {
    updateData.date_debut = parseDate(payload.date_debut) as any
  }
  
  if (payload.date_fin !== undefined) {
    updateData.date_fin = parseDate(payload.date_fin) as any
  }
  
  if (payload.league_id !== undefined) {
    updateData.league_id = payload.league_id || null
  }

  // Mettre à jour directement dans la base de données
  if (Object.keys(updateData).length > 0) {
    await repo.update(id, updateData)
  }

  // Recharger avec les relations pour retourner les données complètes
  const updated = await repo.findOne({
    where: { id },
    relations: {
      league: true,
    },
  })
  
  if (!updated) {
    throw new Error('Saison introuvable après mise à jour')
  }
  
  return toPlain(updated)
}

export async function deleteSaisonAdmin(id: string, leagueId?: string | null) {
  const dataSource = await getDataSource()
  const repo = dataSource.getRepository<Saison>('saisons')
  
  const saison = await repo.findOne({
    where: { id },
    relations: {
      league: true,
    },
  })

  if (!saison) {
    throw new Error('Saison introuvable')
  }

  // Vérifier s'il y a des journées associées
  const journeeRepo = dataSource.getRepository('journees')
  const journeesCount = await journeeRepo.count({
    where: { saison_id: id },
  })

  if (journeesCount > 0) {
    throw new Error(`Impossible de supprimer cette saison car elle contient ${journeesCount} journée(s)`)
  }

  await repo.delete(id)
  return { success: true }
}


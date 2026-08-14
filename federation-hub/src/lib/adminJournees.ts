import { getDataSource } from './db'
import { Journee } from './entities'
import { toPlain, toPlainArray } from './serialization'

export interface JourneeCreateInput {
  saison_id: string
  numero?: number | null
  nom_fr?: string | null
  nom_en?: string | null
  nom_ar?: string | null
  date_journee?: string | null
}

export interface JourneeUpdateInput {
  saison_id?: string
  numero?: number | null
  nom_fr?: string | null
  nom_en?: string | null
  nom_ar?: string | null
  date_journee?: string | null
}

function parseDate(value?: string | null) {
  if (!value) return null
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return null
  }
  return parsed
}

export async function listJourneesForAdmin(leagueId?: string | null) {
  const dataSource = await getDataSource()
  const repo = dataSource.getRepository<Journee>('journees')
  const qb = repo
    .createQueryBuilder('journee')
    .select([
      'journee.id',
      'journee.saison_id',
      'journee.numero',
      'journee.nom_fr',
      'journee.nom_en',
      'journee.nom_ar',
      'journee.date_journee',
      'journee.created_at',
    ])
    .leftJoinAndSelect('journee.saison', 'saison')
    .leftJoinAndSelect('saison.league', 'league')
    .leftJoinAndSelect('league.federation', 'federation')
    .orderBy('CASE WHEN journee.numero IS NULL THEN 1 ELSE 0 END', 'ASC')
    .addOrderBy('journee.numero', 'DESC')
    .addOrderBy('CASE WHEN journee.nom_fr IS NULL THEN 1 ELSE 0 END', 'ASC')
    .addOrderBy('journee.nom_fr', 'ASC')

  if (leagueId) {
    qb.where('saison.league_id = :leagueId', { leagueId })
  }

  const rows = await qb.getMany()
  return toPlainArray(rows)
}

export async function createJourneeAdmin(payload: JourneeCreateInput, leagueId?: string | null) {
  const dataSource = await getDataSource()
  const repo = dataSource.getRepository<Journee>('journees')
  const saisonRepo = dataSource.getRepository('saisons')

  // Vérifier que la saison existe et appartient à la ligue
  const saison = await saisonRepo.findOne({
    where: { id: payload.saison_id },
  })

  if (!saison) {
    throw new Error('Saison introuvable')
  }

  // Vérifier le type de compétition de la saison
  const isCoupe = saison.type_competition === 'coupe' || saison.type_competition === 'tournois'

  // Pour les compétitions de type "coupe", on utilise le nom au lieu du numéro
  if (isCoupe) {
    if (!payload.nom_fr) {
      throw new Error('Le nom de la journée est obligatoire pour une compétition de type "coupe"')
    }
    
    // Vérifier l'unicité du nom pour cette saison
    const existing = await repo.findOne({
      where: {
        saison_id: payload.saison_id,
        nom_fr: payload.nom_fr,
      },
    })

    if (existing) {
      throw new Error(`Une journée avec le nom "${payload.nom_fr}" existe déjà pour cette saison`)
    }
  } else {
    // Pour les championnats, on utilise le numéro
    if (!payload.numero) {
      throw new Error('Le numéro de la journée est obligatoire pour un championnat')
    }
    
    // Vérifier l'unicité du numéro pour cette saison
    const existing = await repo.findOne({
      where: {
        saison_id: payload.saison_id,
        numero: payload.numero,
      },
    })

    if (existing) {
      throw new Error(`Une journée avec le numéro ${payload.numero} existe déjà pour cette saison`)
    }
  }

  // Créer la nouvelle journée
  // Pour les championnats, on garde le numéro mais on permet aussi les traductions
  const newJournee = repo.create({
    saison_id: payload.saison_id,
    numero: isCoupe ? null : payload.numero,
    nom_fr: payload.nom_fr || null,
    nom_en: payload.nom_en || null,
    nom_ar: payload.nom_ar || null,
    date_journee: parseDate(payload.date_journee),
  })

  const saved = await repo.save(newJournee)

  // Recharger avec les relations
  const journee = await repo.findOne({
    where: { id: saved.id },
    relations: {
      saison: true,
    },
  })

  if (!journee) {
    throw new Error('Erreur lors de la création de la journée')
  }

  return toPlain(journee)
}

export async function updateJourneeAdmin(id: string, payload: JourneeUpdateInput, leagueId?: string | null) {
  const dataSource = await getDataSource()
  const repo = dataSource.getRepository<Journee>('journees')
  const journee = await repo.findOne({
    where: { id },
    relations: {
      saison: true,
    },
  })

  if (!journee) {
    throw new Error('Journée introuvable')
  }

  // Récupérer les informations de la saison pour déterminer le type de compétition
  const targetSaisonId = payload.saison_id || journee.saison_id
  const saisonRepo = dataSource.getRepository('saisons')
  
  // Vérifier la saison si elle est modifiée ou récupérer la saison actuelle
  const saisonData = await saisonRepo.findOne({
    where: { id: targetSaisonId },
  })

  if (!saisonData) {
    throw new Error('Saison introuvable')
  }

  const isCoupe = saisonData.type_competition === 'coupe' || saisonData.type_competition === 'tournois'

  // Vérifier l'unicité selon le type de compétition
  if (isCoupe) {
    if (payload.nom_fr !== undefined && payload.nom_fr !== null && payload.nom_fr !== journee.nom_fr) {
      const existing = await repo.findOne({
        where: {
          saison_id: targetSaisonId,
          nom_fr: payload.nom_fr,
        },
      })

      if (existing && existing.id !== id) {
        throw new Error(`Une journée avec le nom "${payload.nom_fr}" existe déjà pour cette saison`)
      }
    }
  } else {
    if (payload.numero !== undefined && payload.numero !== null && payload.numero !== journee.numero) {
      const existing = await repo.findOne({
        where: {
          saison_id: targetSaisonId,
          numero: payload.numero,
        },
      })

      if (existing && existing.id !== id) {
        throw new Error(`Une journée avec le numéro ${payload.numero} existe déjà pour cette saison`)
      }
    }
  }

  // Construire l'objet de mise à jour
  const updateData: Partial<Journee> = {}
  
  if (payload.saison_id !== undefined) {
    updateData.saison_id = payload.saison_id
  }
  
  if (isCoupe) {
    // Pour les coupes, on met à jour le nom et on met numero à null
    if (payload.nom_fr !== undefined) {
      updateData.nom_fr = payload.nom_fr
    }
    if (payload.nom_en !== undefined) {
      updateData.nom_en = payload.nom_en
    }
    if (payload.nom_ar !== undefined) {
      updateData.nom_ar = payload.nom_ar
    }
    updateData.numero = null
  } else {
    // Pour les championnats, on met à jour le numéro mais on permet aussi les traductions
    if (payload.numero !== undefined) {
      updateData.numero = payload.numero
    }
    // Permettre les traductions même pour les championnats
    if (payload.nom_fr !== undefined) {
      updateData.nom_fr = payload.nom_fr
    }
    if (payload.nom_en !== undefined) {
      updateData.nom_en = payload.nom_en
    }
    if (payload.nom_ar !== undefined) {
      updateData.nom_ar = payload.nom_ar
    }
  }
  
  if (payload.date_journee !== undefined) {
    updateData.date_journee = parseDate(payload.date_journee)
  }

  // Mettre à jour directement dans la base de données
  if (Object.keys(updateData).length > 0) {
    await repo.update(id, updateData)
  }

  // Recharger avec les relations pour retourner les données complètes
  const updated = await repo.findOne({
    where: { id },
    relations: {
      saison: true,
    },
  })
  
  if (!updated) {
    throw new Error('Journée introuvable après mise à jour')
  }
  
  return toPlain(updated)
}

export async function deleteJourneeAdmin(id: string, leagueId?: string | null) {
  const dataSource = await getDataSource()
  const repo = dataSource.getRepository<Journee>('journees')
  
  const journee = await repo.findOne({
    where: { id },
    relations: {
      saison: true,
    },
  })

  if (!journee) {
    throw new Error('Journée introuvable')
  }

  // Vérifier s'il y a des matches associés
  const matchRepo = dataSource.getRepository('matches')
  const matchesCount = await matchRepo.count({
    where: { journee_id: id },
  })

  if (matchesCount > 0) {
    throw new Error(`Impossible de supprimer cette journée car elle contient ${matchesCount} match(es)`)
  }

  await repo.delete(id)
  return { success: true }
}


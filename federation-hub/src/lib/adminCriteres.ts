import { getDataSource } from './db'
import { CritereDefinitionEntity } from './entities'
import { toPlain, toPlainArray } from './serialization'

export interface CritereInput {
  id: string
  categorie: 'arbitre' | 'var' | 'assistant'
  label_fr: string
  label_en?: string | null
  label_ar: string
  description_fr?: string | null
  description_ar?: string | null
  season_id?: string | null
  competition_id?: string | null
}

/**
 * ARBI-004 — le barème public (`critere_definitions`, partagé avec
 * arbinote) est append-only : `updateCritere` ne mute jamais une version en
 * place, `deleteCritere` ne supprime jamais une ligne — sinon un vote déjà
 * écrit perdrait rétroactivement son libellé ou verrait son critère
 * réinterprété. Seules les versions globales (scope NULL) en vigueur
 * "maintenant" sont listées ici, cohérent avec la lecture publique côté
 * arbinote (`fetchCritereDefinitions`).
 */
export async function listCriteres() {
  const dataSource = await getDataSource()
  const repo = dataSource.getRepository<CritereDefinitionEntity>('critere_definitions')
  const now = new Date()
  const rows = await repo
    .createQueryBuilder('critere')
    .where('critere.effective_from <= :now', { now })
    .andWhere('(critere.effective_until IS NULL OR critere.effective_until > :now)', { now })
    .getMany()

  const latestById = new Map<string, CritereDefinitionEntity>()
  for (const row of rows) {
    const existing = latestById.get(row.id)
    if (!existing || row.version > existing.version) {
      latestById.set(row.id, row)
    }
  }

  const active = [...latestById.values()].sort((a, b) => {
    if (a.categorie !== b.categorie) return a.categorie.localeCompare(b.categorie)
    return a.id.localeCompare(b.id)
  })
  return toPlainArray(active)
}

/** Historique complet des versions d'un critère (plus récente d'abord) — écran d'administration. */
export async function listCritereVersions(id: string) {
  const dataSource = await getDataSource()
  const repo = dataSource.getRepository<CritereDefinitionEntity>('critere_definitions')
  const rows = await repo.find({ where: { id }, order: { version: 'DESC' } })
  return toPlainArray(rows)
}

export async function createCritere(payload: CritereInput) {
  const dataSource = await getDataSource()
  const repo = dataSource.getRepository<CritereDefinitionEntity>('critere_definitions')
  const existing = await repo.findOne({ where: { id: payload.id }, order: { version: 'DESC' } })
  if (existing) {
    throw new Error('Un critère avec cet identifiant existe déjà')
  }
  const entity = repo.create({ ...payload, version: 1, effective_from: new Date(), effective_until: null })
  const saved = await repo.save(entity)
  return toPlain(saved)
}

/**
 * Clôture la version en vigueur (`effective_until = now`) et insère la
 * suivante dans la même transaction, pour qu'une évaluation/vote déjà écrit
 * continue de résoudre l'ancienne version à son instant d'origine.
 */
export async function updateCritere(id: string, payload: Partial<CritereInput>) {
  const dataSource = await getDataSource()
  return dataSource.transaction(async (manager) => {
    const repo = manager.getRepository<CritereDefinitionEntity>('critere_definitions')
    const current = await repo.findOne({ where: { id }, order: { version: 'DESC' } })
    if (!current) {
      throw new Error('Critère introuvable')
    }

    const now = new Date()
    if (!current.effective_until || current.effective_until.getTime() > now.getTime()) {
      current.effective_until = now
      await repo.save(current)
    }

    const next = repo.create({
      id,
      version: current.version + 1,
      season_id: payload.season_id !== undefined ? payload.season_id : current.season_id,
      competition_id: payload.competition_id !== undefined ? payload.competition_id : current.competition_id,
      effective_from: now,
      effective_until: null,
      categorie: payload.categorie ?? current.categorie,
      label_fr: payload.label_fr ?? current.label_fr,
      label_en: payload.label_en !== undefined ? payload.label_en : current.label_en,
      label_ar: payload.label_ar ?? current.label_ar,
      description_fr: payload.description_fr !== undefined ? payload.description_fr : current.description_fr,
      description_ar: payload.description_ar !== undefined ? payload.description_ar : current.description_ar,
    })
    const saved = await repo.save(next)
    return toPlain(saved)
  })
}

/** Retire (soft) la version en vigueur — jamais de suppression physique d'une ligne historisée. */
export async function deleteCritere(id: string) {
  const dataSource = await getDataSource()
  const repo = dataSource.getRepository<CritereDefinitionEntity>('critere_definitions')
  const current = await repo.findOne({ where: { id }, order: { version: 'DESC' } })
  if (!current) {
    throw new Error('Critère introuvable')
  }
  if (current.effective_until && current.effective_until.getTime() <= Date.now()) {
    throw new Error('Ce critère est déjà retiré')
  }
  current.effective_until = new Date()
  await repo.save(current)
  return { success: true }
}

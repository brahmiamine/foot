import { getDataSource } from './db'
import { OfficialRefereeCriterion } from './entities'

export interface OfficialCriterionInput {
  id: string
  label_fr: string
  label_en?: string | null
  label_ar?: string | null
  weight?: number
  display_order?: number
  is_active?: boolean
  season_id?: string | null
  competition_id?: string | null
}

export class OfficialCriterionScoreError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'OfficialCriterionScoreError'
  }
}

export interface ListOfficialCriteriaOptions {
  activeOnly?: boolean
  /** REF-007 — résout le barème tel qu'il était en vigueur à cet instant (non-rétroactivité). */
  at?: Date
  seasonId?: string | null
  competitionId?: string | null
}

/**
 * REF-007 — un `id` de critère peut avoir plusieurs versions historisées
 * (append-only). On ne retourne que la version en vigueur à `at`, la plus
 * spécifique (saison/compétition) l'emportant sur une version globale pour
 * le même `id`.
 */
export async function listOfficialCriteria(options: ListOfficialCriteriaOptions = {}): Promise<OfficialRefereeCriterion[]> {
  const { activeOnly = false, at = new Date(), seasonId = null, competitionId = null } = options
  const ds = await getDataSource()
  const qb = ds.getRepository(OfficialRefereeCriterion).createQueryBuilder('criterion')
    .where('criterion.effective_from <= :at', { at })
    .andWhere('(criterion.effective_until IS NULL OR criterion.effective_until > :at)', { at })
    .andWhere('(criterion.season_id IS NULL OR criterion.season_id = :seasonId)', { seasonId })
    .andWhere('(criterion.competition_id IS NULL OR criterion.competition_id = :competitionId)', { competitionId })
  if (activeOnly) qb.andWhere('criterion.is_active = :active', { active: true })
  const rows = await qb.getMany()

  const bestById = new Map<string, OfficialRefereeCriterion>()
  for (const row of rows) {
    const existing = bestById.get(row.id)
    if (!existing) {
      bestById.set(row.id, row)
      continue
    }
    const rowSpecific = row.season_id != null || row.competition_id != null
    const existingSpecific = existing.season_id != null || existing.competition_id != null
    if (rowSpecific && !existingSpecific) {
      bestById.set(row.id, row)
    } else if (rowSpecific === existingSpecific && row.version > existing.version) {
      bestById.set(row.id, row)
    }
  }

  return [...bestById.values()].sort(
    (left, right) => left.display_order - right.display_order || left.id.localeCompare(right.id),
  )
}

/** Calcule la note officielle exclusivement depuis le barème privé actif à `at` (défaut : maintenant). */
export async function calculateOfficialScore(
  rawScores: unknown,
  options: { at?: Date; seasonId?: string | null; competitionId?: string | null } = {},
): Promise<{ scores: Record<string, number>; note: number; criteriaEffectiveAt: Date }> {
  if (!rawScores || typeof rawScores !== 'object' || Array.isArray(rawScores)) {
    throw new OfficialCriterionScoreError('Les notes par critère sont requises')
  }

  const at = options.at ?? new Date()
  const criteria = await listOfficialCriteria({ activeOnly: true, at, seasonId: options.seasonId, competitionId: options.competitionId })
  if (criteria.length === 0) {
    throw new OfficialCriterionScoreError("Aucun critère officiel actif n'est configuré")
  }

  const submitted = rawScores as Record<string, unknown>
  const activeIds = new Set(criteria.map((criterion) => criterion.id))
  if (Object.keys(submitted).some((id) => !activeIds.has(id))) {
    throw new OfficialCriterionScoreError('Le rapport contient un critère officiel inconnu ou inactif')
  }

  let weightedTotal = 0
  let weightTotal = 0
  const scores: Record<string, number> = {}
  for (const criterion of criteria) {
    const score = Number(submitted[criterion.id])
    if (!Number.isFinite(score) || score < 1 || score > 5) {
      throw new OfficialCriterionScoreError(`Une note de 1 à 5 est requise pour le critère ${criterion.id}`)
    }
    const weight = Number(criterion.weight)
    if (!Number.isFinite(weight) || weight <= 0) {
      throw new OfficialCriterionScoreError(`Le poids du critère ${criterion.id} est invalide`)
    }
    scores[criterion.id] = score
    weightedTotal += score * weight
    weightTotal += weight
  }

  return { scores, note: Math.round((weightedTotal / weightTotal) * 100) / 100, criteriaEffectiveAt: at }
}

export async function createOfficialCriterion(input: OfficialCriterionInput) {
  if (!input.id?.trim() || !input.label_fr?.trim()) throw new Error('id et label_fr sont requis')
  if (input.weight !== undefined && (!Number.isFinite(input.weight) || input.weight <= 0)) {
    throw new Error('Le poids doit être un nombre strictement positif')
  }
  const ds = await getDataSource()
  const repo = ds.getRepository(OfficialRefereeCriterion)
  return repo.save(repo.create({
    id: input.id.trim(),
    version: 1,
    season_id: input.season_id ?? null,
    competition_id: input.competition_id ?? null,
    effective_from: new Date(),
    effective_until: null,
    label_fr: input.label_fr.trim(),
    label_en: input.label_en?.trim() || null,
    label_ar: input.label_ar?.trim() || null,
    weight: input.weight ?? 1,
    display_order: input.display_order ?? 0,
    is_active: input.is_active ?? true,
  }))
}

/**
 * REF-007 — n'édite jamais la version en vigueur : clôture sa fenêtre
 * d'effet (`effective_until = now`) et insère la version suivante dans la
 * même transaction, pour que les évaluations déjà écrites continuent de
 * résoudre l'ancienne version à leur `criteria_effective_at`.
 */
export async function updateOfficialCriterion(id: string, input: Partial<OfficialCriterionInput>) {
  if (input.weight !== undefined && (!Number.isFinite(input.weight) || input.weight <= 0)) {
    throw new Error('Le poids doit être un nombre strictement positif')
  }
  const ds = await getDataSource()
  return ds.transaction(async (manager) => {
    const repo = manager.getRepository(OfficialRefereeCriterion)
    const current = await repo.findOne({ where: { id }, order: { version: 'DESC' } })
    if (!current) throw new Error('Critère officiel introuvable')

    const now = new Date()
    if (!current.effective_until || current.effective_until.getTime() > now.getTime()) {
      current.effective_until = now
      await repo.save(current)
    }

    const next = repo.create({
      id,
      version: current.version + 1,
      season_id: input.season_id !== undefined ? input.season_id : current.season_id,
      competition_id: input.competition_id !== undefined ? input.competition_id : current.competition_id,
      effective_from: now,
      effective_until: null,
      label_fr: input.label_fr !== undefined ? input.label_fr.trim() : current.label_fr,
      label_en: input.label_en !== undefined ? (input.label_en?.trim() || null) : current.label_en,
      label_ar: input.label_ar !== undefined ? (input.label_ar?.trim() || null) : current.label_ar,
      weight: input.weight !== undefined ? input.weight : current.weight,
      display_order: input.display_order !== undefined ? input.display_order : current.display_order,
      is_active: input.is_active !== undefined ? input.is_active : current.is_active,
    })
    return repo.save(next)
  })
}

/** Historique complet des versions d'un critère (plus récente d'abord) — écran d'administration. */
export async function listOfficialCriterionVersions(id: string): Promise<OfficialRefereeCriterion[]> {
  const ds = await getDataSource()
  return ds.getRepository(OfficialRefereeCriterion).find({ where: { id }, order: { version: 'DESC' } })
}

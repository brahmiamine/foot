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
}

export class OfficialCriterionScoreError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'OfficialCriterionScoreError'
  }
}

export async function listOfficialCriteria(activeOnly = false) {
  const ds = await getDataSource()
  const qb = ds.getRepository(OfficialRefereeCriterion).createQueryBuilder('criterion')
    .orderBy('criterion.display_order', 'ASC')
    .addOrderBy('criterion.id', 'ASC')
  if (activeOnly) qb.where('criterion.is_active = :active', { active: true })
  return qb.getMany()
}

/** Calcule la note officielle exclusivement depuis le barème privé actif. */
export async function calculateOfficialScore(rawScores: unknown): Promise<{
  scores: Record<string, number>
  note: number
}> {
  if (!rawScores || typeof rawScores !== 'object' || Array.isArray(rawScores)) {
    throw new OfficialCriterionScoreError('Les notes par critère sont requises')
  }

  const criteria = await listOfficialCriteria(true)
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

  return { scores, note: Math.round((weightedTotal / weightTotal) * 100) / 100 }
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
    label_fr: input.label_fr.trim(),
    label_en: input.label_en?.trim() || null,
    label_ar: input.label_ar?.trim() || null,
    weight: input.weight ?? 1,
    display_order: input.display_order ?? 0,
    is_active: input.is_active ?? true,
  }))
}

export async function updateOfficialCriterion(id: string, input: Partial<OfficialCriterionInput>) {
  const ds = await getDataSource()
  const repo = ds.getRepository(OfficialRefereeCriterion)
  const criterion = await repo.findOne({ where: { id } })
  if (!criterion) throw new Error('Critère officiel introuvable')
  if (input.weight !== undefined && (!Number.isFinite(input.weight) || input.weight <= 0)) {
    throw new Error('Le poids doit être un nombre strictement positif')
  }
  if (input.label_fr !== undefined) criterion.label_fr = input.label_fr.trim()
  if (input.label_en !== undefined) criterion.label_en = input.label_en?.trim() || null
  if (input.label_ar !== undefined) criterion.label_ar = input.label_ar?.trim() || null
  if (input.weight !== undefined) criterion.weight = input.weight
  if (input.display_order !== undefined) criterion.display_order = input.display_order
  if (input.is_active !== undefined) criterion.is_active = input.is_active
  return repo.save(criterion)
}

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
}

export async function listCriteres() {
  const dataSource = await getDataSource()
  const repo = dataSource.getRepository<CritereDefinitionEntity>('critere_definitions')
  const rows = await repo.find({ order: { categorie: 'ASC', id: 'ASC' } })
  return toPlainArray(rows)
}

export async function createCritere(payload: CritereInput) {
  const dataSource = await getDataSource()
  const repo = dataSource.getRepository<CritereDefinitionEntity>('critere_definitions')
  const existing = await repo.findOne({ where: { id: payload.id } })
  if (existing) {
    throw new Error('Un critère avec cet identifiant existe déjà')
  }
  const entity = repo.create(payload)
  const saved = await repo.save(entity)
  return toPlain(saved)
}

export async function updateCritere(id: string, payload: Partial<CritereInput>) {
  const dataSource = await getDataSource()
  const repo = dataSource.getRepository<CritereDefinitionEntity>('critere_definitions')
  const existing = await repo.findOne({ where: { id } })
  if (!existing) {
    throw new Error('Critère introuvable')
  }
  repo.merge(existing, payload)
  const saved = await repo.save(existing)
  return toPlain(saved)
}

export async function deleteCritere(id: string) {
  const dataSource = await getDataSource()
  const repo = dataSource.getRepository<CritereDefinitionEntity>('critere_definitions')
  const result = await repo.delete({ id })
  if (result.affected === 0) {
    throw new Error('Critère introuvable')
  }
  return { success: true }
}



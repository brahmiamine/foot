import { unstable_cache } from 'next/cache'
import { getDataSource } from '../db'
import { CritereDefinitionEntity } from '../entities'
import { toPlainArray } from '../serialization'

/**
 * ARBI-004 — ne retourne que la version en vigueur "maintenant" de chaque
 * critère public, jamais une version future ou déjà retirée. Seules les
 * versions globales (`season_id`/`competition_id` NULL) sont retournées ici
 * : un critère scopé à une saison/compétition n'apparaît que via une
 * résolution explicitement scopée (non requise par les écrans publics
 * actuels, qui affichent toujours le barème global).
 */
export async function fetchCritereDefinitionsUncached() {
  const dataSource = await getDataSource()
  const repo = dataSource.getRepository<CritereDefinitionEntity>('critere_definitions')
  const now = new Date()
  const rows = await repo
    .createQueryBuilder('critere')
    .where('critere.season_id IS NULL')
    .andWhere('critere.competition_id IS NULL')
    .andWhere('critere.effective_from <= :now', { now })
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

export const fetchCritereDefinitions = unstable_cache(
  fetchCritereDefinitionsUncached,
  ['fetchCritereDefinitions'],
  { revalidate: 120 }
)

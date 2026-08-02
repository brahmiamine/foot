import { unstable_cache } from 'next/cache'
import { getDataSource } from '../db'
import { CritereDefinitionEntity } from '../entities'
import { toPlainArray } from '../serialization'

async function fetchCritereDefinitionsUncached() {
  const dataSource = await getDataSource()
  const repo = dataSource.getRepository<CritereDefinitionEntity>('critere_definitions')
  const rows = await repo.find({
    order: {
      categorie: 'ASC',
      id: 'ASC',
    },
  })
  return toPlainArray(rows)
}

export const fetchCritereDefinitions = unstable_cache(
  fetchCritereDefinitionsUncached,
  ['fetchCritereDefinitions'],
  { revalidate: 120 }
)

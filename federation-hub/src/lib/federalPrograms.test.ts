import { describe, expect, it, vi } from 'vitest'
import type { DataSource } from 'typeorm'
import { assertGrantJustificatifsSatisfied } from './federalPrograms'

function sourceWith(requirements: Array<{ id: string; name: string }>, validSubmissionRequirementIds: string[]): DataSource {
  const query = vi.fn(async (sql: string, params: unknown[]) => {
    if (sql.includes('FROM regulatory_document_requirements')) return requirements
    if (sql.includes('FROM regulatory_document_submissions')) {
      const requirementId = params[0] as string
      return validSubmissionRequirementIds.includes(requirementId) ? [{}] : []
    }
    return []
  })
  return { query } as unknown as DataSource
}

describe('assertGrantJustificatifsSatisfied (FED-007)', () => {
  it('passes when the domain has no mandatory GRANT requirement configured', async () => {
    await expect(assertGrantJustificatifsSatisfied(sourceWith([], []), 'fed', null, null, 'app-1')).resolves.toBeUndefined()
  })

  it('blocks approval when a mandatory requirement has no VALID submission', async () => {
    const source = sourceWith([{ id: 'req-1', name: 'RIB club' }], [])
    await expect(assertGrantJustificatifsSatisfied(source, 'fed', null, null, 'app-1')).rejects.toThrow(/RIB club/)
  })

  it('allows approval once every mandatory requirement has a VALID submission', async () => {
    const source = sourceWith([{ id: 'req-1', name: 'RIB club' }, { id: 'req-2', name: 'Budget prévisionnel' }], ['req-1', 'req-2'])
    await expect(assertGrantJustificatifsSatisfied(source, 'fed', null, null, 'app-1')).resolves.toBeUndefined()
  })

  it('reports every missing requirement, not just the first one', async () => {
    const source = sourceWith([{ id: 'req-1', name: 'RIB club' }, { id: 'req-2', name: 'Budget prévisionnel' }], [])
    await expect(assertGrantJustificatifsSatisfied(source, 'fed', null, null, 'app-1')).rejects.toThrow(/RIB club[\s\S]*Budget prévisionnel/)
  })
})

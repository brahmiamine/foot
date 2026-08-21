import { getDataSource } from './db'
import { ArbiNoteVotingPolicy, type ArbiNoteVotingPolicyScopeType, type ArbiNoteVotingPolicyValues } from './entities/ArbiNoteVotingPolicy'
import { ArbiNoteConfigurationAudit } from './entities/ArbiNoteConfigurationAudit'
import { DEFAULT_VOTING_POLICY } from './votingPolicy'
import {
  resolvePolicy,
  type PolicyContext,
  type PolicyRecord,
  type ResolvedPolicy,
} from '../../../packages/domain-contracts/src/policy'
import {
  requireConfigurationChangeReason,
  type ConfigurationAuditContext,
} from '../../../packages/domain-contracts/src/configuration-audit'

function toPolicyRecord(row: ArbiNoteVotingPolicy): PolicyRecord<ArbiNoteVotingPolicyValues> {
  return {
    id: row.id,
    scopeType: row.scopeType,
    scopeId: row.scopeId,
    version: row.version,
    effectiveFrom: row.effectiveFrom,
    effectiveUntil: row.effectiveUntil,
    values: row.values,
  }
}

export interface ArbiNoteVotingScopeContext {
  federationId?: string | null
  leagueId?: string | null
  seasonId?: string | null
}

export interface UpsertVotingPolicyInput extends ConfigurationAuditContext {
  scopeType: ArbiNoteVotingPolicyScopeType
  scopeId: string | null
  values: Partial<ArbiNoteVotingPolicyValues>
  effectiveFrom?: Date | null
  effectiveUntil?: Date | null
}

/**
 * ARBI-001/002/003 / GOV-004 / GOV-005 — policy versionnée résolue
 * PLATFORM -> FEDERATION -> LEAGUE -> SEASON, modifiable uniquement avec
 * motif obligatoire audité.
 */
export class ArbiNoteVotingPolicyService {
  async resolveExplained(
    scope: ArbiNoteVotingScopeContext = {},
    at: Date = new Date(),
  ): Promise<ResolvedPolicy<ArbiNoteVotingPolicyValues>> {
    const dataSource = await getDataSource()
    const records = await dataSource.getRepository(ArbiNoteVotingPolicy).find()
    const context: PolicyContext = {
      federationId: scope.federationId ?? null,
      leagueId: scope.leagueId ?? null,
      seasonId: scope.seasonId ?? null,
    }
    return resolvePolicy(DEFAULT_VOTING_POLICY, records.map(toPolicyRecord), context, at)
  }

  async resolve(scope: ArbiNoteVotingScopeContext = {}, at: Date = new Date()): Promise<ArbiNoteVotingPolicyValues> {
    return (await this.resolveExplained(scope, at)).values
  }

  async findAll(): Promise<ArbiNoteVotingPolicy[]> {
    const dataSource = await getDataSource()
    return dataSource.getRepository(ArbiNoteVotingPolicy).find({ order: { scopeType: 'ASC', version: 'DESC' } })
  }

  async upsert(input: UpsertVotingPolicyInput): Promise<ArbiNoteVotingPolicy> {
    if (input.scopeType !== 'PLATFORM' && !input.scopeId) {
      throw new Error('scopeId est requis pour une policy hors PLATFORM')
    }
    const scopeId = input.scopeType === 'PLATFORM' ? null : input.scopeId
    const reason = requireConfigurationChangeReason(input.reason)
    const activation = input.effectiveFrom ?? new Date()
    if (input.effectiveUntil && input.effectiveUntil.getTime() <= activation.getTime()) {
      throw new Error("La fin d'effet de la policy doit être postérieure à son début d'effet")
    }

    const dataSource = await getDataSource()
    return dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(ArbiNoteVotingPolicy)
      const auditRepository = manager.getRepository(ArbiNoteConfigurationAudit)
      const current = await repository.findOne({
        where: { scopeType: input.scopeType, scopeId: scopeId ?? undefined },
        order: { version: 'DESC' },
      })

      const nextVersion = current ? current.version + 1 : 1
      const saved = await repository.save(
        repository.create({
          scopeType: input.scopeType,
          scopeId,
          version: nextVersion,
          effectiveFrom: activation,
          effectiveUntil: input.effectiveUntil ?? null,
          values: input.values,
          updatedBy: input.actorUserId,
        }),
      )

      await auditRepository.save(
        auditRepository.create({
          domain: 'ARBINOTE_VOTING',
          configurationKey: 'VOTING_POLICY',
          scopeType: input.scopeType,
          scopeId,
          previousVersion: current?.version ?? null,
          newVersion: saved.version,
          before: current ? { values: current.values } : null,
          after: { values: saved.values },
          actorUserId: input.actorUserId,
          actorRole: input.actorRole,
          reason,
          ipAddress: input.ipAddress ?? null,
          userAgent: input.userAgent ?? null,
        }),
      )

      return saved
    })
  }
}

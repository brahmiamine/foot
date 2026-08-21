import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm'

export type ArbiNoteVotingPolicyScopeType = 'PLATFORM' | 'FEDERATION' | 'LEAGUE' | 'SEASON'
export type ArbiNoteVotingMode = 'ANONYMOUS' | 'MEMBERS' | 'VERIFIED'

export interface ArbiNoteVotingPolicyValues {
  votingMode: ArbiNoteVotingMode
  voteOpenMinutesAfterStart: number
  voteCloseHoursAfterMatch: number | null
  minimumVotesBeforeScoreVisible: number
  quarantineConfidenceThreshold: number
}

/**
 * ARBI-001/002/003 — policy versionnée (GOV-001 `resolvePolicy`, GOV-004)
 * résolue PLATFORM -> FEDERATION -> LEAGUE -> SEASON : mode de vote
 * (anonyme/membres/vérifié), fenêtre de vote, seuil minimal de votes avant
 * score public visible, seuil de confiance de mise en quarantaine
 * automatique des votes suspects.
 */
@Entity({ name: 'arbinote_voting_policies' })
@Index(['scopeType', 'scopeId'])
export class ArbiNoteVotingPolicy {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ type: 'enum', enum: ['PLATFORM', 'FEDERATION', 'LEAGUE', 'SEASON'], name: 'scope_type' })
  scopeType!: ArbiNoteVotingPolicyScopeType

  @Column({ type: 'varchar', length: 36, nullable: true, name: 'scope_id' })
  scopeId!: string | null

  @Column({ type: 'int' })
  version!: number

  @Column({ type: 'datetime', nullable: true, name: 'effective_from' })
  effectiveFrom!: Date | null

  @Column({ type: 'datetime', nullable: true, name: 'effective_until' })
  effectiveUntil!: Date | null

  @Column({ type: 'json', name: 'values_json' })
  values!: Partial<ArbiNoteVotingPolicyValues>

  @Column({ type: 'varchar', length: 191, name: 'updated_by' })
  updatedBy!: string

  @Column({ type: 'timestamp', nullable: true, name: 'created_at' })
  createdAt?: Date
}

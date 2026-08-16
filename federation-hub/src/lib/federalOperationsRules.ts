export type CommissionQuorumRule = 'ABSOLUTE_MAJORITY' | 'TWO_THIRDS' | 'FIXED'
export type CommissionSessionStatus = 'DRAFT' | 'CONVENED' | 'IN_SESSION' | 'DELIBERATION' | 'CLOSED' | 'CANCELLED'

export class FederalOperationWorkflowError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'FederalOperationWorkflowError'
  }
}

export function calculateRequiredQuorum(votingMembers: number, rule: CommissionQuorumRule, fixedQuorum?: number | null): number {
  if (!Number.isInteger(votingMembers) || votingMembers < 1) {
    throw new FederalOperationWorkflowError('Une commission décisionnaire doit avoir au moins un membre votant actif')
  }
  if (rule === 'ABSOLUTE_MAJORITY') return Math.floor(votingMembers / 2) + 1
  if (rule === 'TWO_THIRDS') return Math.ceil((votingMembers * 2) / 3)
  if (!Number.isInteger(fixedQuorum) || !fixedQuorum || fixedQuorum < 1 || fixedQuorum > votingMembers) {
    throw new FederalOperationWorkflowError('Le quorum fixe doit être compris entre 1 et le nombre de membres votants')
  }
  return fixedQuorum
}

const SESSION_TRANSITIONS: Record<CommissionSessionStatus, CommissionSessionStatus[]> = {
  DRAFT: ['CONVENED', 'CANCELLED'],
  CONVENED: ['IN_SESSION', 'CANCELLED'],
  IN_SESSION: ['DELIBERATION'],
  DELIBERATION: ['CLOSED'],
  CLOSED: [],
  CANCELLED: [],
}

export function assertCommissionSessionTransition(from: CommissionSessionStatus, to: CommissionSessionStatus, quorumMet: boolean): void {
  if (!SESSION_TRANSITIONS[from].includes(to)) {
    throw new FederalOperationWorkflowError(`Transition de séance interdite : ${from} -> ${to}`)
  }
  if (to === 'DELIBERATION' && !quorumMet) {
    throw new FederalOperationWorkflowError('Impossible d’ouvrir la délibération : quorum non atteint')
  }
}

export function assertCommissionDecisionAllowed(status: CommissionSessionStatus, quorumMet: boolean): void {
  if (status !== 'DELIBERATION') {
    throw new FederalOperationWorkflowError('Une décision ne peut être enregistrée que pendant la délibération')
  }
  if (!quorumMet) throw new FederalOperationWorkflowError('Une décision ne peut pas être rendue sans quorum')
}

export function assertDecisionMutable(signedAt?: Date | string | null): void {
  if (signedAt) throw new FederalOperationWorkflowError('Une décision signée est immuable')
}

export function assertPositiveAmount(value: number, label = 'montant'): void {
  if (!Number.isFinite(value) || value <= 0) throw new FederalOperationWorkflowError(`${label} doit être strictement positif`)
}

export function assertAllocationDoesNotExceed(total: number, allocations: number[], label = 'répartition'): void {
  assertPositiveAmount(total, 'montant de référence')
  const sum = allocations.reduce((acc, value) => acc + value, 0)
  if (allocations.some(value => !Number.isFinite(value) || value < 0)) {
    throw new FederalOperationWorkflowError(`${label} contient un montant invalide`)
  }
  if (sum - total > 0.001) {
    throw new FederalOperationWorkflowError(`${label} dépasse le montant de référence`)
  }
}

export function assertAllocationMatchesTotal(total: number, allocations: number[], label = 'répartition'): void {
  assertAllocationDoesNotExceed(total, allocations, label)
  const sum = allocations.reduce((acc, value) => acc + value, 0)
  if (Math.abs(sum - total) > 0.001) {
    throw new FederalOperationWorkflowError(`${label} doit correspondre exactement au montant de référence`)
  }
}

export function effectiveExpiringStatus<T extends string>(status: T, expiresAt: Date | string | null | undefined, now = new Date()): T | 'EXPIRED' {
  if (!expiresAt) return status
  return new Date(expiresAt).getTime() < now.getTime() ? 'EXPIRED' : status
}

export function assertDateRange(startsAt: Date | string, endsAt: Date | string, label = 'période'): void {
  const start = new Date(startsAt)
  const end = new Date(endsAt)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end.getTime() <= start.getTime()) {
    throw new FederalOperationWorkflowError(`${label} invalide : la date de fin doit être postérieure à la date de début`)
  }
}

export function computeSolidarityContribution(transferAmount: number, contributionRate: number): number {
  assertPositiveAmount(transferAmount, 'montant du transfert')
  if (!Number.isFinite(contributionRate) || contributionRate <= 0 || contributionRate > 1) {
    throw new FederalOperationWorkflowError('Le taux de solidarité doit être supérieur à 0 et inférieur ou égal à 1')
  }
  return Math.round(transferAmount * contributionRate * 1000) / 1000
}

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

/**
 * FED-009 : statut agrégé d'un dossier d'indemnité de formation ou d'une
 * contribution de solidarité après changement du statut d'un bénéficiaire.
 * Une seule contestation suffit à rouvrir le dossier ; il ne repasse à PAID
 * que lorsque tous les bénéficiaires sont réellement payés.
 */
export function computeAggregateCaseStatus(beneficiaryStatuses: readonly string[]): 'DECIDED' | 'PAID' | 'DISPUTED' {
  if (beneficiaryStatuses.some((status) => status === 'DISPUTED')) return 'DISPUTED'
  if (beneficiaryStatuses.length > 0 && beneficiaryStatuses.every((status) => status === 'PAID')) return 'PAID'
  return 'DECIDED'
}

export type RegulatorySlaState = 'IN_SLA' | 'DUE_SOON' | 'OVERDUE'

/** FED-010 : état SLA d'un dossier en attente, calculé à la volée (pas de tâche planifiée). */
export function computeRegulatorySlaState(hoursPending: number, warnAfterHours: number, overdueAfterHours: number): RegulatorySlaState {
  if (hoursPending >= overdueAfterHours) return 'OVERDUE'
  if (hoursPending >= warnAfterHours) return 'DUE_SOON'
  return 'IN_SLA'
}

export function assertValidSlaThresholds(warnAfterHours: number, overdueAfterHours: number): void {
  if (!Number.isInteger(warnAfterHours) || warnAfterHours < 1) throw new FederalOperationWorkflowError("Le délai d'alerte SLA doit être un entier positif")
  if (!Number.isInteger(overdueAfterHours) || overdueAfterHours < 1) throw new FederalOperationWorkflowError('Le délai de dépassement SLA doit être un entier positif')
  if (overdueAfterHours <= warnAfterHours) throw new FederalOperationWorkflowError("Le délai de dépassement SLA doit être supérieur au délai d'alerte")
}

export function computeSolidarityContribution(transferAmount: number, contributionRate: number): number {
  assertPositiveAmount(transferAmount, 'montant du transfert')
  if (!Number.isFinite(contributionRate) || contributionRate <= 0 || contributionRate > 1) {
    throw new FederalOperationWorkflowError('Le taux de solidarité doit être supérieur à 0 et inférieur ou égal à 1')
  }
  return Math.round(transferAmount * contributionRate * 1000) / 1000
}

export type ApprovalMode = 'AUTO' | 'SINGLE_APPROVAL' | 'DUAL_APPROVAL' | 'COMMISSION'

export interface ApprovalPolicy {
  mode: ApprovalMode
  /** When true, the user who prepared/submitted the request cannot approve it. */
  makerCheckerEnabled: boolean
}

export interface ApprovalState {
  makerUserId: string
  approverUserIds: string[]
  commissionQuorumMet?: boolean
  commissionApproved?: boolean
}

export interface ApprovalEvaluation {
  mode: ApprovalMode
  requiredApprovals: number | null
  collectedApprovals: number
  remainingApprovals: number | null
  canFinalize: boolean
}

export interface RegisteredApproval {
  /** Canonical resulting approval state. */
  state: ApprovalState
  /** Explicit alias for callers that need to distinguish input vs resulting state. */
  nextState: ApprovalState
  evaluation: ApprovalEvaluation
}

export class ApprovalPolicyError extends Error {
  constructor(
    readonly code:
      | 'AUTO_APPROVAL_IS_NOT_MANUAL'
      | 'MAKER_CANNOT_APPROVE'
      | 'DUPLICATE_APPROVER'
      | 'INVALID_APPROVAL_STATE',
    message: string,
  ) {
    super(message)
    this.name = 'ApprovalPolicyError'
  }
}

export function requiredApprovalCount(mode: ApprovalMode): number | null {
  switch (mode) {
    case 'AUTO':
      return 0
    case 'SINGLE_APPROVAL':
      return 1
    case 'DUAL_APPROVAL':
      return 2
    case 'COMMISSION':
      return null
  }
}

function unique(values: string[]): string[] {
  return [...new Set(values)]
}

export function evaluateApproval(policy: ApprovalPolicy, state: ApprovalState): ApprovalEvaluation {
  const distinctApprovers = unique(state.approverUserIds)
  if (distinctApprovers.length !== state.approverUserIds.length) {
    throw new ApprovalPolicyError('INVALID_APPROVAL_STATE', 'Approval state contains duplicate approvers')
  }
  if (policy.makerCheckerEnabled && distinctApprovers.includes(state.makerUserId)) {
    throw new ApprovalPolicyError(
      'INVALID_APPROVAL_STATE',
      'Approval state violates maker/checker separation',
    )
  }

  if (policy.mode === 'COMMISSION') {
    return {
      mode: policy.mode,
      requiredApprovals: null,
      collectedApprovals: distinctApprovers.length,
      remainingApprovals: null,
      canFinalize: state.commissionQuorumMet === true && state.commissionApproved === true,
    }
  }

  const requiredApprovals = requiredApprovalCount(policy.mode) ?? 0
  const collectedApprovals = distinctApprovers.length
  return {
    mode: policy.mode,
    requiredApprovals,
    collectedApprovals,
    remainingApprovals: Math.max(0, requiredApprovals - collectedApprovals),
    canFinalize: policy.mode === 'AUTO' || collectedApprovals >= requiredApprovals,
  }
}

/**
 * Register one positive manual approval. Domain services remain responsible
 * for checking the actor's business permission/scope before calling this.
 */
export function registerApproval(
  policy: ApprovalPolicy,
  state: ApprovalState,
  actorUserId: string,
): RegisteredApproval {
  if (policy.mode === 'AUTO') {
    throw new ApprovalPolicyError(
      'AUTO_APPROVAL_IS_NOT_MANUAL',
      'AUTO policies must be finalized by the domain workflow, not a manual approver',
    )
  }
  if (policy.mode === 'COMMISSION') {
    throw new ApprovalPolicyError(
      'INVALID_APPROVAL_STATE',
      'COMMISSION approval must be supplied by the commission decision workflow',
    )
  }
  if (policy.makerCheckerEnabled && actorUserId === state.makerUserId) {
    throw new ApprovalPolicyError('MAKER_CANNOT_APPROVE', 'The maker cannot approve their own request')
  }
  if (state.approverUserIds.includes(actorUserId)) {
    throw new ApprovalPolicyError('DUPLICATE_APPROVER', 'The same user cannot approve twice')
  }

  const nextState: ApprovalState = {
    ...state,
    approverUserIds: [...state.approverUserIds, actorUserId],
  }
  return {
    state: nextState,
    nextState,
    evaluation: evaluateApproval(policy, nextState),
  }
}

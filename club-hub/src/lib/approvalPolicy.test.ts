import { describe, expect, it } from 'vitest'
import {
  ApprovalPolicyError,
  evaluateApproval,
  registerApproval,
  type ApprovalPolicy,
  type ApprovalState,
} from '../../../packages/domain-contracts/src/approval'

const makerState: ApprovalState = {
  makerUserId: 'maker-1',
  approverUserIds: [],
}

describe('approval policy', () => {
  it('finalizes AUTO without a manual approver', () => {
    const policy: ApprovalPolicy = { mode: 'AUTO', makerCheckerEnabled: true }
    expect(evaluateApproval(policy, makerState)).toMatchObject({
      requiredApprovals: 0,
      remainingApprovals: 0,
      canFinalize: true,
    })
    expect(() => registerApproval(policy, makerState, 'checker-1')).toThrowError(
      expect.objectContaining<Partial<ApprovalPolicyError>>({ code: 'AUTO_APPROVAL_IS_NOT_MANUAL' }),
    )
  })

  it('requires one independent approver for SINGLE_APPROVAL', () => {
    const policy: ApprovalPolicy = { mode: 'SINGLE_APPROVAL', makerCheckerEnabled: true }
    const result = registerApproval(policy, makerState, 'checker-1')

    expect(result.state.approverUserIds).toEqual(['checker-1'])
    expect(result.evaluation).toMatchObject({
      requiredApprovals: 1,
      collectedApprovals: 1,
      remainingApprovals: 0,
      canFinalize: true,
    })
  })

  it('requires two distinct approvers for DUAL_APPROVAL', () => {
    const policy: ApprovalPolicy = { mode: 'DUAL_APPROVAL', makerCheckerEnabled: true }
    const first = registerApproval(policy, makerState, 'checker-1')
    expect(first.evaluation.canFinalize).toBe(false)
    expect(first.evaluation.remainingApprovals).toBe(1)

    const second = registerApproval(policy, first.state, 'checker-2')
    expect(second.evaluation.canFinalize).toBe(true)
    expect(second.evaluation.collectedApprovals).toBe(2)
  })

  it('blocks the maker and duplicate approvals when separation is enabled', () => {
    const policy: ApprovalPolicy = { mode: 'DUAL_APPROVAL', makerCheckerEnabled: true }

    expect(() => registerApproval(policy, makerState, 'maker-1')).toThrowError(
      expect.objectContaining<Partial<ApprovalPolicyError>>({ code: 'MAKER_CANNOT_APPROVE' }),
    )

    const first = registerApproval(policy, makerState, 'checker-1')
    expect(() => registerApproval(policy, first.state, 'checker-1')).toThrowError(
      expect.objectContaining<Partial<ApprovalPolicyError>>({ code: 'DUPLICATE_APPROVER' }),
    )
  })

  it('lets a commission finalize only with quorum and an approved decision', () => {
    const policy: ApprovalPolicy = { mode: 'COMMISSION', makerCheckerEnabled: true }

    expect(
      evaluateApproval(policy, {
        ...makerState,
        commissionQuorumMet: true,
        commissionApproved: false,
      }).canFinalize,
    ).toBe(false)

    expect(
      evaluateApproval(policy, {
        ...makerState,
        commissionQuorumMet: true,
        commissionApproved: true,
      }).canFinalize,
    ).toBe(true)
  })
})

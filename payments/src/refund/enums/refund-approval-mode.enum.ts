import type { ApprovalMode } from '../../../../packages/domain-contracts/src/approval';

/**
 * PAY-002 uses the shared GOV-002 approval vocabulary while keeping a local
 * runtime object for TypeORM. `@foot/domain-contracts` is source-only ESM and
 * payments is a Nest NodeNext service, so this is intentionally a type-only
 * dependency rather than a runtime import across package/module boundaries.
 */
export const RefundApprovalMode = {
  AUTO: 'AUTO',
  SINGLE_APPROVAL: 'SINGLE_APPROVAL',
  DUAL_APPROVAL: 'DUAL_APPROVAL',
} as const satisfies Readonly<
  Record<'AUTO' | 'SINGLE_APPROVAL' | 'DUAL_APPROVAL', ApprovalMode>
>;

export type RefundApprovalMode =
  (typeof RefundApprovalMode)[keyof typeof RefundApprovalMode];

export function requiredRefundApprovalCount(mode: RefundApprovalMode): number {
  switch (mode) {
    case RefundApprovalMode.AUTO:
      return 0;
    case RefundApprovalMode.SINGLE_APPROVAL:
      return 1;
    case RefundApprovalMode.DUAL_APPROVAL:
      return 2;
  }
}

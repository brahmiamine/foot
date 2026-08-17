export enum RefundApprovalMode {
  AUTO = 'AUTO',
  SINGLE_APPROVAL = 'SINGLE_APPROVAL',
  DUAL_APPROVAL = 'DUAL_APPROVAL',
}

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

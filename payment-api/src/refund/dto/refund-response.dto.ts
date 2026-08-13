import { Refund } from '../entities/refund.entity';

/** What GET /payments/:id/refunds/remaining returns. */
export class RemainingRefundableDto {
  paymentId: string;
  paymentAmount: string;
  currency: string;
  remainingRefundable: string;

  constructor(
    paymentId: string,
    paymentAmount: string,
    currency: string,
    remainingRefundable: string,
  ) {
    this.paymentId = paymentId;
    this.paymentAmount = paymentAmount;
    this.currency = currency;
    this.remainingRefundable = remainingRefundable;
  }
}

export type RefundDto = Refund;

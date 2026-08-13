import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';

export class RefundPaymentNotPaidError extends BadRequestException {
  constructor() {
    super('Only a PAID payment can be refunded.');
  }
}

export class RefundAmountExceedsRemainingError extends BadRequestException {
  constructor(remaining: string, currency: string) {
    super(
      `Refund amount exceeds the remaining refundable amount (${remaining} ${currency}).`,
    );
  }
}

export class RefundNotFoundError extends NotFoundException {
  constructor() {
    super('Refund not found');
  }
}

/** Thrown when an operator action is attempted from a status it doesn't apply to. */
export class RefundInvalidStateError extends ConflictException {
  constructor(action: string, currentStatus: string) {
    super(`Cannot ${action} a refund in status ${currentStatus}.`);
  }
}

import { IsIn, IsString, MaxLength, MinLength } from 'class-validator';
import { PaymentReconciliationResolutionAction } from '../payment-reconciliation.enums';

export class ResolvePaymentReconciliationCaseDto {
  @IsIn([
    PaymentReconciliationResolutionAction.ACCEPT_INTERNAL,
    PaymentReconciliationResolutionAction.DOCUMENT_EXCEPTION,
  ])
  action:
    | PaymentReconciliationResolutionAction.ACCEPT_INTERNAL
    | PaymentReconciliationResolutionAction.DOCUMENT_EXCEPTION;

  @IsString()
  @MinLength(3)
  @MaxLength(2000)
  note: string;
}

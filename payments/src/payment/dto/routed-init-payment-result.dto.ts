import { PaymentProviderName } from '../enums/payment-provider.enum';

export class RoutedInitPaymentResultDto {
  paymentId: string;
  provider: PaymentProviderName;
  providerRef: string;
  payUrl: string;
}

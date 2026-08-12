import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PAYMENT_PAID_EVENT } from '../payment/payment.service';
import type { PaymentPaidEvent } from '../payment/payment.service';
import { WebhookDispatchService } from './webhook-dispatch.service';

/**
 * Relaie chaque paiement confirmé PAID à l'application appelante via un
 * webhook signé — voir WebhookDispatchService. Symétrique à
 * PaymentNotificationsListener (qui notifie le payeur) : celui-ci notifie
 * l'application métier elle-même.
 */
@Injectable()
export class PaymentWebhookListener {
  constructor(private readonly webhookDispatch: WebhookDispatchService) {}

  @OnEvent(PAYMENT_PAID_EVENT)
  async handlePaymentPaid(event: PaymentPaidEvent): Promise<void> {
    await this.webhookDispatch.dispatch(event.callerApplication, {
      eventId: `payment-paid:${event.paymentId}`,
      paymentId: event.paymentId,
      orderId: event.orderId,
      status: 'PAID',
      provider: event.provider,
      providerRef: event.providerRef,
      amount: event.amount,
      currency: event.currency,
      userId: event.userId,
    });
  }
}

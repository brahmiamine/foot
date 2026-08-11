import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PAYMENT_PAID_EVENT } from '../payment/payment.service';
import type { PaymentPaidEvent } from '../payment/payment.service';
import { NotificationClientService } from './notification-client.service';

/**
 * Notifies the payer via notification-api once a payment is confirmed PAID.
 * Only fires when the initiating application provided a `userId` at
 * `init` time (see InitPaymentDto/InitPaymeePaymentDto) — payment-api has
 * no other way to identify the payer (guest/anonymous checkouts are never
 * notified). Runs after the PAID transition has already been committed:
 * a notification-api failure here never rolls back or blocks the payment.
 */
@Injectable()
export class PaymentNotificationsListener {
  constructor(private readonly notificationClient: NotificationClientService) {}

  @OnEvent(PAYMENT_PAID_EVENT)
  async handlePaymentPaid(event: PaymentPaidEvent): Promise<void> {
    if (!event.userId) {
      return;
    }

    await this.notificationClient.notify({
      eventId: `payment-succeeded:${event.paymentId}`,
      type: 'PAYMENT_SUCCEEDED',
      userId: event.userId,
      category: 'PAYMENT_SUCCEEDED',
      title: 'Paiement confirmé',
      body: `Votre paiement de ${event.amount} ${event.currency} a été confirmé.`,
      data: {
        paymentId: event.paymentId,
        orderId: event.orderId,
        provider: event.provider,
        amount: event.amount,
        currency: event.currency,
      },
    });
  }
}

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment } from './entities/payment.entity';
import { PaymentProviderName } from './enums/payment-provider.enum';
import { PaymentStatus } from './enums/payment-status.enum';
import { InitPaymentDto } from './dto/init-payment.dto';
import { InitPaymentResultDto } from './dto/init-payment-result.dto';
import { KonnectProvider } from './providers/konnect/konnect.provider';
import {
  InitPaymeePaymentDto,
  PaymeeIntegrationMode,
} from './providers/paymee/dto/init-paymee-payment.dto';
import { InitPaymeePaymentResultDto } from './providers/paymee/dto/init-paymee-payment-result.dto';
import { formatPaymeeAmount } from './providers/paymee/paymee.mapper';
import { PaymeeProvider } from './providers/paymee/paymee.provider';
import { PaymeePaymentNotFoundError } from './providers/paymee/paymee.exceptions';
import { PaymeeWebhookPayload } from './providers/paymee/paymee.types';
import { FlouciProvider } from './providers/flouci/flouci.provider';

export const PAYMENT_PAID_EVENT = 'payment.paid';

export interface PaymentPaidEvent {
  paymentId: string;
  orderId: string;
  provider: PaymentProviderName;
  providerRef: string;
  userId: string | null;
  callerApplication: string | null;
  amount: string;
  currency: string;
}

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    private readonly konnectProvider: KonnectProvider,
    private readonly paymeeProvider: PaymeeProvider,
    private readonly flouciProvider: FlouciProvider,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async findById(id: string): Promise<Payment> {
    const payment = await this.paymentRepository.findOne({ where: { id } });
    if (!payment) {
      throw new NotFoundException('Payment not found');
    }
    return payment;
  }

  async initiateKonnectPayment(
    dto: InitPaymentDto,
    callerApplication: string,
  ): Promise<InitPaymentResultDto> {
    const payment = this.paymentRepository.create({
      orderId: dto.orderId,
      userId: dto.userId ?? null,
      callerApplication,
      provider: PaymentProviderName.KONNECT,
      amount: dto.amount.toFixed(3),
      currency: dto.currency ?? 'TND',
      status: PaymentStatus.PENDING,
    });
    await this.paymentRepository.save(payment);

    const initiated = await this.konnectProvider.initiatePayment({
      orderId: dto.orderId,
      amount: dto.amount,
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: dto.email,
      phoneNumber: dto.phoneNumber,
      paymentId: payment.id,
    });

    payment.providerRef = initiated.providerRef;
    payment.payUrl = initiated.payUrl;
    await this.paymentRepository.save(payment);

    this.logger.log(
      `Payment ${payment.id} initiated via Konnect (order ${payment.orderId})`,
    );

    return {
      paymentId: payment.id,
      payUrl: initiated.payUrl,
      providerRef: initiated.providerRef,
    };
  }

  /**
   * Processes a Konnect webhook notification. Idempotent: calling this
   * repeatedly for the same payment_ref never re-triggers the PAID
   * transition (and its side effects) more than once, and never trusts the
   * webhook alone — the real status always comes from a fresh call to
   * Konnect's get-payment-details endpoint.
   */
  async handleKonnectWebhook(providerRef: string): Promise<void> {
    const payment = await this.paymentRepository.findOne({
      where: { provider: PaymentProviderName.KONNECT, providerRef },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found for this payment_ref');
    }

    await this.paymentRepository.update(payment.id, {
      webhookReceivedCount: payment.webhookReceivedCount + 1,
      lastWebhookAt: new Date(),
    });

    if (payment.status === PaymentStatus.PAID) {
      this.logger.log(
        `Webhook for already-paid payment ${payment.id}, ignoring (idempotent).`,
      );
      return;
    }

    const verification = await this.konnectProvider.verifyPayment(providerRef, {
      orderId: payment.orderId,
      amount: payment.amount,
      currency: payment.currency,
    });

    if (verification.internalStatus === PaymentStatus.PAID) {
      // Atomic, conditional transition: only the first webhook delivery to
      // reach this point actually flips the row and fires the event, even
      // under concurrent/duplicate deliveries.
      const result = await this.paymentRepository
        .createQueryBuilder()
        .update(Payment)
        .set({
          status: PaymentStatus.PAID,
          paidAt: new Date(),
          lastProviderStatus: verification.providerStatus,
        })
        .where('id = :id', { id: payment.id })
        .andWhere('status != :paid', { paid: PaymentStatus.PAID })
        .execute();

      if (result.affected && result.affected > 0) {
        const event: PaymentPaidEvent = {
          paymentId: payment.id,
          orderId: payment.orderId,
          provider: payment.provider,
          providerRef,
          userId: payment.userId,
          callerApplication: payment.callerApplication,
          amount: payment.amount,
          currency: payment.currency,
        };
        this.eventEmitter.emit(PAYMENT_PAID_EVENT, event);
        this.logger.log(
          `Payment ${payment.id} marked PAID (order ${payment.orderId}).`,
        );
      }
      return;
    }

    await this.paymentRepository.update(payment.id, {
      status: verification.internalStatus,
      lastProviderStatus: verification.providerStatus,
    });
  }

  async initiatePaymeePayment(
    dto: InitPaymeePaymentDto,
    callerApplication: string,
  ): Promise<InitPaymeePaymentResultDto> {
    const mode = dto.mode ?? PaymeeIntegrationMode.REDIRECT;

    const payment = this.paymentRepository.create({
      orderId: dto.orderId,
      userId: dto.userId ?? null,
      callerApplication,
      provider: PaymentProviderName.PAYMEE,
      amount: formatPaymeeAmount(dto.amount),
      currency: 'TND',
      status: PaymentStatus.PENDING,
    });
    await this.paymentRepository.save(payment);

    const initiated = await this.paymeeProvider.initiatePayment({
      orderId: dto.orderId,
      amount: dto.amount,
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: dto.email,
      phoneNumber: dto.phoneNumber,
    });

    payment.providerRef = initiated.token;
    payment.payUrl = initiated.payUrl;
    await this.paymentRepository.save(payment);

    this.logger.log(
      `Payment ${payment.id} initiated via Paymee (order ${payment.orderId}, mode ${mode})`,
    );

    return {
      paymentId: payment.id,
      token: initiated.token,
      payUrl:
        mode === PaymeeIntegrationMode.REDIRECT ? initiated.payUrl : undefined,
    };
  }

  /**
   * Processes a Paymee webhook notification, following Paymee's mandatory
   * order: verify check_sum before ever looking up the internal payment,
   * then verify order_id/amount before trusting payment_status. Idempotent:
   * calling this repeatedly for the same token never re-triggers the PAID
   * transition (and its side effects) more than once.
   */
  async handlePaymeeWebhook(payload: PaymeeWebhookPayload): Promise<void> {
    this.paymeeProvider.verifyChecksum(
      payload.token,
      payload.payment_status,
      payload.check_sum,
    );

    const payment = await this.paymentRepository.findOne({
      where: {
        provider: PaymentProviderName.PAYMEE,
        providerRef: payload.token,
      },
    });

    if (!payment) {
      throw new PaymeePaymentNotFoundError();
    }

    await this.paymentRepository.update(payment.id, {
      webhookReceivedCount: payment.webhookReceivedCount + 1,
      lastWebhookAt: new Date(),
    });

    if (payment.status === PaymentStatus.PAID) {
      this.logger.log(
        `Webhook for already-paid Paymee payment ${payment.id}, ignoring (idempotent).`,
      );
      return;
    }

    const verification = this.paymeeProvider.verifyPayment(payload, {
      orderId: payment.orderId,
      amount: payment.amount,
    });

    if (verification.internalStatus === PaymentStatus.PAID) {
      // Atomic, conditional transition: only the first webhook delivery to
      // reach this point actually flips the row and fires the event, even
      // under concurrent/duplicate deliveries.
      const result = await this.paymentRepository
        .createQueryBuilder()
        .update(Payment)
        .set({
          status: PaymentStatus.PAID,
          paidAt: new Date(),
          lastProviderStatus: verification.providerStatus,
          receivedAmount: verification.receivedAmount ?? null,
          providerFee: verification.fee ?? null,
        })
        .where('id = :id', { id: payment.id })
        .andWhere('status != :paid', { paid: PaymentStatus.PAID })
        .execute();

      if (result.affected && result.affected > 0) {
        const event: PaymentPaidEvent = {
          paymentId: payment.id,
          orderId: payment.orderId,
          provider: payment.provider,
          providerRef: payload.token,
          userId: payment.userId,
          callerApplication: payment.callerApplication,
          amount: payment.amount,
          currency: payment.currency,
        };
        this.eventEmitter.emit(PAYMENT_PAID_EVENT, event);
        this.logger.log(
          `Payment ${payment.id} marked PAID via Paymee (order ${payment.orderId}).`,
        );
      }
      return;
    }

    await this.paymentRepository.update(payment.id, {
      status: verification.internalStatus,
      lastProviderStatus: verification.providerStatus,
    });
  }

  async initiateFlouciPayment(
    dto: InitPaymentDto,
    callerApplication: string,
  ): Promise<InitPaymentResultDto> {
    const payment = this.paymentRepository.create({
      orderId: dto.orderId,
      userId: dto.userId ?? null,
      callerApplication,
      provider: PaymentProviderName.FLOUCI,
      amount: dto.amount.toFixed(3),
      currency: dto.currency ?? 'TND',
      status: PaymentStatus.PENDING,
    });
    await this.paymentRepository.save(payment);

    // Flouci's developer_tracking_id is an opaque, unvalidated field — use
    // our own internal payment id (not orderId) so it stays correlated to
    // this exact record regardless of how orderId is reused/formatted.
    const initiated = await this.flouciProvider.initiatePayment({
      trackingId: payment.id,
      amount: dto.amount,
      clientId: dto.email,
    });

    payment.providerRef = initiated.providerRef;
    payment.payUrl = initiated.payUrl;
    await this.paymentRepository.save(payment);

    this.logger.log(
      `Payment ${payment.id} initiated via Flouci (order ${payment.orderId})`,
    );

    return {
      paymentId: payment.id,
      payUrl: initiated.payUrl,
      providerRef: initiated.providerRef,
    };
  }

  /**
   * Processes a Flouci webhook notification. The webhook itself carries no
   * trustworthy status — it's only a "check now" signal; the real status
   * always comes from a fresh call to Flouci's verify_payment endpoint.
   * Idempotent: an already-PAID payment short-circuits before any
   * verify_payment call, both to guarantee exactly-once business effects
   * and to avoid the repeated-verification pattern Flouci's docs warn
   * against (rate limiting / IP blocks).
   */
  async handleFlouciWebhook(paymentId: string): Promise<void> {
    const payment = await this.paymentRepository.findOne({
      where: { provider: PaymentProviderName.FLOUCI, providerRef: paymentId },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found for this payment_id');
    }

    await this.paymentRepository.update(payment.id, {
      webhookReceivedCount: payment.webhookReceivedCount + 1,
      lastWebhookAt: new Date(),
    });

    if (payment.status === PaymentStatus.PAID) {
      this.logger.log(
        `Webhook for already-paid Flouci payment ${payment.id}, ignoring (idempotent).`,
      );
      return;
    }

    const verification = await this.flouciProvider.verifyPayment(paymentId, {
      trackingId: payment.id,
      amount: payment.amount,
    });

    if (verification.internalStatus === PaymentStatus.PAID) {
      // Atomic, conditional transition: only the first webhook delivery to
      // reach this point actually flips the row and fires the event, even
      // under concurrent/duplicate deliveries.
      const result = await this.paymentRepository
        .createQueryBuilder()
        .update(Payment)
        .set({
          status: PaymentStatus.PAID,
          paidAt: new Date(),
          lastProviderStatus: verification.providerStatus,
        })
        .where('id = :id', { id: payment.id })
        .andWhere('status != :paid', { paid: PaymentStatus.PAID })
        .execute();

      if (result.affected && result.affected > 0) {
        const event: PaymentPaidEvent = {
          paymentId: payment.id,
          orderId: payment.orderId,
          provider: payment.provider,
          providerRef: paymentId,
          userId: payment.userId,
          callerApplication: payment.callerApplication,
          amount: payment.amount,
          currency: payment.currency,
        };
        this.eventEmitter.emit(PAYMENT_PAID_EVENT, event);
        this.logger.log(
          `Payment ${payment.id} marked PAID via Flouci (order ${payment.orderId}).`,
        );
      }
      return;
    }

    await this.paymentRepository.update(payment.id, {
      status: verification.internalStatus,
      lastProviderStatus: verification.providerStatus,
    });
  }
}

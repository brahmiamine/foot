import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, QueryFailedError, Repository } from 'typeorm';
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
import { OutboxService } from '../outbox/outbox.service';

export const PAYMENT_PAID_EVENT_TYPE = 'PAYMENT_PAID';

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
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly konnectProvider: KonnectProvider,
    private readonly paymeeProvider: PaymeeProvider,
    private readonly flouciProvider: FlouciProvider,
    private readonly outboxService: OutboxService,
  ) {}

  async findById(id: string): Promise<Payment> {
    const payment = await this.paymentRepository.findOne({ where: { id } });
    if (!payment) {
      throw new NotFoundException('Payment not found');
    }
    return payment;
  }

  /**
   * TASK-P0-005 (todo.md): looks up a payment already created for this
   * exact (caller, idempotency key) pair, so a retried init call (network
   * timeout, double click) returns the original payment instead of
   * charging the payer twice.
   */
  private async findByIdempotencyKey(
    callerApplication: string,
    idempotencyKey: string | undefined,
  ): Promise<Payment | null> {
    if (!idempotencyKey) return null;
    return this.paymentRepository.findOne({
      where: { callerApplication, idempotencyKey },
    });
  }

  private isDuplicateIdempotencyKeyError(error: unknown): boolean {
    return (
      error instanceof QueryFailedError &&
      (error as unknown as { code?: string }).code === 'ER_DUP_ENTRY'
    );
  }

  /**
   * Two concurrent retries of the same init call can both pass the
   * `findByIdempotencyKey` check before either commits; the unique index
   * on (callerApplication, idempotencyKey) then rejects the loser's
   * INSERT. Rather than surface that as a 500, treat it the same as a
   * sequential replay: fetch and return the payment the winner created.
   * Any other error is a real failure and propagates as-is.
   */
  private async recoverFromRaceOrThrow(
    error: unknown,
    callerApplication: string,
    idempotencyKey: string | undefined,
  ): Promise<Payment> {
    if (this.isDuplicateIdempotencyKeyError(error)) {
      const existing = await this.findByIdempotencyKey(
        callerApplication,
        idempotencyKey,
      );
      if (existing) return existing;
    }
    throw error;
  }

  /**
   * Transition atomique PENDING/... → PAID + écriture de l'événement outbox
   * (TS-12, avancement.md) dans LA MÊME transaction : soit les deux
   * committent ensemble, soit aucun des deux — remplace le couple
   * "UPDATE conditionnel puis eventEmitter.emit()" qui pouvait committer le
   * premier et perdre le second (crash process, listener en échec sans
   * persistance). Ne déclenche jamais elle-même de webhook/notification :
   * voir OutboxWorkerService (../outbox/outbox-worker.service.ts).
   * Retourne `true` seulement si CET appel a fait la transition (garantie
   * d'exactly-once même sous livraisons concurrentes/dupliquées du webhook
   * provider).
   */
  private async transitionToPaid(
    payment: Payment,
    extra: Partial<
      Pick<Payment, 'lastProviderStatus' | 'receivedAmount' | 'providerFee'>
    >,
  ): Promise<boolean> {
    return this.dataSource.transaction(async (manager) => {
      const result = await manager
        .createQueryBuilder()
        .update(Payment)
        .set({
          status: PaymentStatus.PAID,
          paidAt: new Date(),
          ...extra,
        })
        .where('id = :id', { id: payment.id })
        .andWhere('status != :paid', { paid: PaymentStatus.PAID })
        .execute();

      const didTransition = !!result.affected && result.affected > 0;
      if (didTransition) {
        const event: PaymentPaidEvent = {
          paymentId: payment.id,
          orderId: payment.orderId,
          provider: payment.provider,
          providerRef: payment.providerRef ?? '',
          userId: payment.userId,
          callerApplication: payment.callerApplication,
          amount: payment.amount,
          currency: payment.currency,
        };
        await this.outboxService.enqueue(manager, {
          eventType: PAYMENT_PAID_EVENT_TYPE,
          aggregateId: payment.id,
          payload: event as unknown as Record<string, unknown>,
        });
      }
      return didTransition;
    });
  }

  async initiateKonnectPayment(
    dto: InitPaymentDto,
    callerApplication: string,
    idempotencyKey?: string,
  ): Promise<InitPaymentResultDto> {
    const existing = await this.findByIdempotencyKey(
      callerApplication,
      idempotencyKey,
    );
    if (existing) {
      this.logger.log(
        `Idempotent replay of Konnect init for payment ${existing.id} (order ${existing.orderId}), skipping re-initiation.`,
      );
      return {
        paymentId: existing.id,
        payUrl: existing.payUrl ?? '',
        providerRef: existing.providerRef ?? '',
      };
    }

    const payment = this.paymentRepository.create({
      orderId: dto.orderId,
      userId: dto.userId ?? null,
      callerApplication,
      idempotencyKey: idempotencyKey ?? null,
      provider: PaymentProviderName.KONNECT,
      amount: dto.amount.toFixed(3),
      currency: dto.currency ?? 'TND',
      status: PaymentStatus.PENDING,
    });
    try {
      await this.paymentRepository.save(payment);
    } catch (error) {
      const raced = await this.recoverFromRaceOrThrow(
        error,
        callerApplication,
        idempotencyKey,
      );
      return {
        paymentId: raced.id,
        payUrl: raced.payUrl ?? '',
        providerRef: raced.providerRef ?? '',
      };
    }

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
      const didTransition = await this.transitionToPaid(payment, {
        lastProviderStatus: verification.providerStatus,
      });
      if (didTransition) {
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
    idempotencyKey?: string,
  ): Promise<InitPaymeePaymentResultDto> {
    const mode = dto.mode ?? PaymeeIntegrationMode.REDIRECT;

    const existing = await this.findByIdempotencyKey(
      callerApplication,
      idempotencyKey,
    );
    if (existing) {
      this.logger.log(
        `Idempotent replay of Paymee init for payment ${existing.id} (order ${existing.orderId}), skipping re-initiation.`,
      );
      return {
        paymentId: existing.id,
        token: existing.providerRef ?? '',
        payUrl:
          mode === PaymeeIntegrationMode.REDIRECT
            ? (existing.payUrl ?? undefined)
            : undefined,
      };
    }

    const payment = this.paymentRepository.create({
      orderId: dto.orderId,
      userId: dto.userId ?? null,
      callerApplication,
      idempotencyKey: idempotencyKey ?? null,
      provider: PaymentProviderName.PAYMEE,
      amount: formatPaymeeAmount(dto.amount),
      currency: 'TND',
      status: PaymentStatus.PENDING,
    });
    try {
      await this.paymentRepository.save(payment);
    } catch (error) {
      const raced = await this.recoverFromRaceOrThrow(
        error,
        callerApplication,
        idempotencyKey,
      );
      return {
        paymentId: raced.id,
        token: raced.providerRef ?? '',
        payUrl:
          mode === PaymeeIntegrationMode.REDIRECT
            ? (raced.payUrl ?? undefined)
            : undefined,
      };
    }

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
      const didTransition = await this.transitionToPaid(payment, {
        lastProviderStatus: verification.providerStatus,
        receivedAmount: verification.receivedAmount ?? null,
        providerFee: verification.fee ?? null,
      });
      if (didTransition) {
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
    idempotencyKey?: string,
  ): Promise<InitPaymentResultDto> {
    const existing = await this.findByIdempotencyKey(
      callerApplication,
      idempotencyKey,
    );
    if (existing) {
      this.logger.log(
        `Idempotent replay of Flouci init for payment ${existing.id} (order ${existing.orderId}), skipping re-initiation.`,
      );
      return {
        paymentId: existing.id,
        payUrl: existing.payUrl ?? '',
        providerRef: existing.providerRef ?? '',
      };
    }

    const payment = this.paymentRepository.create({
      orderId: dto.orderId,
      userId: dto.userId ?? null,
      callerApplication,
      idempotencyKey: idempotencyKey ?? null,
      provider: PaymentProviderName.FLOUCI,
      amount: dto.amount.toFixed(3),
      currency: dto.currency ?? 'TND',
      status: PaymentStatus.PENDING,
    });
    try {
      await this.paymentRepository.save(payment);
    } catch (error) {
      const raced = await this.recoverFromRaceOrThrow(
        error,
        callerApplication,
        idempotencyKey,
      );
      return {
        paymentId: raced.id,
        payUrl: raced.payUrl ?? '',
        providerRef: raced.providerRef ?? '',
      };
    }

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
      const didTransition = await this.transitionToPaid(payment, {
        lastProviderStatus: verification.providerStatus,
      });
      if (didTransition) {
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

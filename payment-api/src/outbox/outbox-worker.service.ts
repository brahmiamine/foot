import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, LessThanOrEqual, Repository } from 'typeorm';
import { OutboxEvent, OutboxEventStatus } from './entities/outbox-event.entity';
import { computeNextRetryAt } from './retry-schedule';
import { NotificationClientService } from '../notifications/notification-client.service';
import { WebhookDispatchService } from '../webhooks/webhook-dispatch.service';
import type { PaymentPaidEvent } from '../payment/payment.service';

const POLL_INTERVAL_MS = 5000;
const BATCH_SIZE = 20;

/**
 * Livre les événements de l'outbox (TS-12/TS-13, avancement.md) — seul
 * endroit qui appelle réellement WebhookDispatchService/
 * NotificationClientService pour un `PAYMENT_PAID`, remplaçant les anciens
 * listeners EventEmitter2 (transitoires, perdus au moindre crash). Poll
 * simple par intervalle plutôt qu'une dépendance à @nestjs/schedule —
 * cohérent avec le reste du monorepo, qui n'a pas cette dépendance.
 */
@Injectable()
export class OutboxWorkerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OutboxWorkerService.name);
  private timer: NodeJS.Timeout | null = null;
  private isRunning = false;

  constructor(
    @InjectRepository(OutboxEvent)
    private readonly repository: Repository<OutboxEvent>,
    private readonly webhookDispatch: WebhookDispatchService,
    private readonly notificationClient: NotificationClientService,
  ) {}

  onModuleInit(): void {
    this.timer = setInterval(() => {
      void this.processDueEvents();
    }, POLL_INTERVAL_MS);
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  /**
   * Traite un lot d'événements dus (PENDING sans nextRetryAt, ou dont
   * nextRetryAt est passé). Protégé par `isRunning` contre le
   * chevauchement : un passage lent ne doit jamais se faire doubler par le
   * suivant sur le même process.
   */
  async processDueEvents(): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;
    try {
      const now = new Date();
      const due = await this.repository.find({
        where: [
          { status: OutboxEventStatus.PENDING, nextRetryAt: IsNull() },
          {
            status: OutboxEventStatus.PENDING,
            nextRetryAt: LessThanOrEqual(now),
          },
        ],
        order: { createdAt: 'ASC' },
        take: BATCH_SIZE,
      });

      for (const event of due) {
        await this.processOne(event);
      }
    } finally {
      this.isRunning = false;
    }
  }

  private async processOne(event: OutboxEvent): Promise<void> {
    try {
      if (event.eventType === 'PAYMENT_PAID') {
        await this.deliverPaymentPaid(
          event.payload as unknown as PaymentPaidEvent,
        );
      } else {
        this.logger.warn(
          `Unknown outbox event type "${event.eventType}" (id=${event.id}), marking FAILED.`,
        );
        await this.repository.update(event.id, {
          status: OutboxEventStatus.FAILED,
          lastError: `Unknown event type: ${event.eventType}`,
        });
        return;
      }

      await this.repository.update(event.id, {
        status: OutboxEventStatus.PROCESSED,
        processedAt: new Date(),
        lastError: null,
      });
    } catch (error) {
      const attempts = event.attempts + 1;
      const nextRetryAt = computeNextRetryAt(attempts);
      const message = error instanceof Error ? error.message : String(error);

      if (nextRetryAt) {
        this.logger.warn(
          `Outbox event ${event.id} delivery failed (attempt ${attempts}), retrying at ${nextRetryAt.toISOString()}: ${message}`,
        );
      } else {
        this.logger.error(
          `Outbox event ${event.id} exhausted its retry schedule after ${attempts} attempts, giving up (DLQ): ${message}`,
        );
      }

      await this.repository.update(event.id, {
        attempts,
        status: nextRetryAt
          ? OutboxEventStatus.PENDING
          : OutboxEventStatus.FAILED,
        nextRetryAt,
        lastError: message,
      });
    }
  }

  /**
   * Le webhook métier (application appelante) est le seul canal qui compte
   * pour décider du succès/échec de l'événement — c'est lui que d'autres
   * apps attendent pour confirmer une commande. La notification du payeur
   * reste best-effort (NotificationClientService avale déjà ses propres
   * erreurs, voir sa docstring) : jamais bloquante, jamais retentée par ce
   * worker.
   */
  private async deliverPaymentPaid(payload: PaymentPaidEvent): Promise<void> {
    if (payload.userId) {
      await this.notificationClient.notify({
        eventId: `payment-succeeded:${payload.paymentId}`,
        type: 'PAYMENT_SUCCEEDED',
        userId: payload.userId,
        category: 'PAYMENT_SUCCEEDED',
        title: 'Paiement confirmé',
        body: `Votre paiement de ${payload.amount} ${payload.currency} a été confirmé.`,
        data: {
          paymentId: payload.paymentId,
          orderId: payload.orderId,
          provider: payload.provider,
          amount: payload.amount,
          currency: payload.currency,
        },
      });
    }

    await this.webhookDispatch.dispatch(payload.callerApplication, {
      eventId: `payment-paid:${payload.paymentId}`,
      paymentId: payload.paymentId,
      orderId: payload.orderId,
      status: 'PAID',
      provider: payload.provider,
      providerRef: payload.providerRef,
      amount: payload.amount,
      currency: payload.currency,
      userId: payload.userId,
    });
  }
}

import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, LessThanOrEqual, Repository } from 'typeorm';
import { FinancialLedgerService } from '../ledger/financial-ledger.service';
import { NotificationClientService } from '../notifications/notification-client.service';
import type { PaymentPaidEvent } from '../payment/payment.service';
import {
  REFUND_FAILED_EVENT_TYPE,
  REFUND_MANUAL_REVIEW_EVENT_TYPE,
  REFUND_SUCCEEDED_EVENT_TYPE,
  type RefundEvent,
} from '../refund/refund.service';
import { WebhookDispatchService } from '../webhooks/webhook-dispatch.service';
import { OutboxEvent, OutboxEventStatus } from './entities/outbox-event.entity';
import { computeNextRetryAt } from './retry-schedule';

const POLL_INTERVAL_MS = 5000;
const BATCH_SIZE = 20;

/**
 * Livre les événements de l'outbox (TS-12/TS-13, avancement.md) — seul
 * endroit qui appelle réellement WebhookDispatchService/
 * NotificationClientService pour un `PAYMENT_PAID`, remplaçant les anciens
 * listeners EventEmitter2 (transitoires, perdus au moindre crash). Poll
 * simple par intervalle plutôt qu'une dépendance à @nestjs/schedule —
 * cohérent avec le reste du monorepo, qui n'a pas cette dépendance.
 *
 * PAY-004 projette aussi les faits financiers PAYMENT_PAID et
 * REFUND_SUCCEEDED dans le ledger append-only AVANT la livraison externe.
 * Si la projection échoue, l'événement outbox reste retentable. Si la
 * livraison externe échoue après projection, les clés ledger déterministes
 * rendent le replay sans double écriture.
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
    private readonly financialLedgerService: FinancialLedgerService,
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
      switch (event.eventType) {
        case 'PAYMENT_PAID': {
          const payload = event.payload as unknown as PaymentPaidEvent;
          await this.financialLedgerService.postPaymentPaid(payload);
          await this.deliverPaymentPaid(payload);
          break;
        }
        case REFUND_SUCCEEDED_EVENT_TYPE: {
          const payload = event.payload as unknown as RefundEvent;
          await this.financialLedgerService.postRefundSucceeded(payload);
          await this.deliverRefundEvent(payload, 'REFUND_SUCCEEDED');
          break;
        }
        case REFUND_FAILED_EVENT_TYPE:
          await this.deliverRefundEvent(
            event.payload as unknown as RefundEvent,
            'REFUND_FAILED',
          );
          break;
        case REFUND_MANUAL_REVIEW_EVENT_TYPE:
          await this.deliverRefundEvent(
            event.payload as unknown as RefundEvent,
            'REFUND_MANUAL_REVIEW',
          );
          break;
        default:
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

  /**
   * TASK-P0-001 (todo.md): same split as deliverPaymentPaid — the
   * application webhook is what other apps rely on to update their own
   * state (e.g. release a ticket, close a return); the payer notification
   * is best-effort only.
   */
  private async deliverRefundEvent(
    payload: RefundEvent,
    status: 'REFUND_SUCCEEDED' | 'REFUND_FAILED' | 'REFUND_MANUAL_REVIEW',
  ): Promise<void> {
    if (payload.userId) {
      const notifications: Record<
        typeof status,
        { type: string; title: string; body: string }
      > = {
        REFUND_SUCCEEDED: {
          type: 'REFUND_SUCCEEDED',
          title: 'Remboursement effectué',
          body: `Votre remboursement de ${payload.amount} ${payload.currency} a été effectué.`,
        },
        REFUND_FAILED: {
          type: 'REFUND_FAILED',
          title: 'Remboursement échoué',
          body: `Votre demande de remboursement de ${payload.amount} ${payload.currency} n'a pas pu aboutir. Notre support va vous contacter.`,
        },
        REFUND_MANUAL_REVIEW: {
          type: 'REFUND_PROCESSING',
          title: 'Remboursement en cours de traitement',
          body: `Votre demande de remboursement de ${payload.amount} ${payload.currency} est en cours de traitement manuel.`,
        },
      };
      const notification = notifications[status];
      await this.notificationClient.notify({
        eventId: `${status.toLowerCase()}:${payload.refundId}`,
        type: notification.type,
        userId: payload.userId,
        category: notification.type,
        title: notification.title,
        body: notification.body,
        data: {
          refundId: payload.refundId,
          paymentId: payload.paymentId,
          orderId: payload.orderId,
          provider: payload.provider,
          amount: payload.amount,
          currency: payload.currency,
        },
      });
    }

    await this.webhookDispatch.dispatch(payload.callerApplication, {
      eventId: `${status.toLowerCase()}:${payload.refundId}`,
      paymentId: payload.paymentId,
      orderId: payload.orderId,
      status,
      provider: payload.provider,
      providerRef: '',
      amount: payload.amount,
      currency: payload.currency,
      userId: payload.userId,
      refundId: payload.refundId,
    });
  }
}

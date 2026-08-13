import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import {
  DataSource,
  EntityManager,
  QueryFailedError,
  Repository,
} from 'typeorm';
import { Payment } from '../payment/entities/payment.entity';
import { PaymentStatus } from '../payment/enums/payment-status.enum';
import { PaymentProviderName } from '../payment/enums/payment-provider.enum';
import { FlouciProvider } from '../payment/providers/flouci/flouci.provider';
import { FlouciError } from '../payment/providers/flouci/flouci.exceptions';
import { OutboxService } from '../outbox/outbox.service';
import { Refund } from './entities/refund.entity';
import { RefundStatusHistory } from './entities/refund-status-history.entity';
import {
  RefundStatus,
  RESERVING_REFUND_STATUSES,
} from './enums/refund-status.enum';
import { CreateRefundDto } from './dto/create-refund.dto';
import { ResolveRefundDto } from './dto/resolve-refund.dto';
import {
  RefundAmountExceedsRemainingError,
  RefundInvalidStateError,
  RefundNotFoundError,
  RefundPaymentNotPaidError,
} from './refund.exceptions';

export const REFUND_SUCCEEDED_EVENT_TYPE = 'REFUND_SUCCEEDED';
export const REFUND_FAILED_EVENT_TYPE = 'REFUND_FAILED';
export const REFUND_MANUAL_REVIEW_EVENT_TYPE = 'REFUND_MANUAL_REVIEW';

export interface RefundEvent {
  refundId: string;
  paymentId: string;
  orderId: string;
  provider: PaymentProviderName;
  userId: string | null;
  callerApplication: string | null;
  amount: string;
  currency: string;
  reason: string | null;
}

/**
 * Only Flouci exposes an automated refund API (verified against provider
 * docs — see flouci.provider.ts). Konnect and Paymee refunds always go to
 * MANUAL_REVIEW: never simulate a success payment-api cannot actually
 * cause.
 */
const AUTO_REFUNDABLE_PROVIDERS: ReadonlySet<PaymentProviderName> = new Set([
  PaymentProviderName.FLOUCI,
]);

@Injectable()
export class RefundService {
  private readonly logger = new Logger(RefundService.name);

  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    @InjectRepository(Refund)
    private readonly refundRepository: Repository<Refund>,
    @InjectRepository(RefundStatusHistory)
    private readonly historyRepository: Repository<RefundStatusHistory>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly flouciProvider: FlouciProvider,
    private readonly outboxService: OutboxService,
  ) {}

  async findById(id: string): Promise<Refund> {
    const refund = await this.refundRepository.findOne({ where: { id } });
    if (!refund) throw new RefundNotFoundError();
    return refund;
  }

  async getHistory(refundId: string): Promise<RefundStatusHistory[]> {
    return this.historyRepository.find({
      where: { refundId },
      order: { createdAt: 'ASC' },
    });
  }

  async listForPayment(paymentId: string): Promise<Refund[]> {
    return this.refundRepository.find({
      where: { paymentId },
      order: { createdAt: 'DESC' },
      take: 200,
    });
  }

  async listByStatus(status: RefundStatus): Promise<Refund[]> {
    return this.refundRepository.find({
      where: { status },
      order: { createdAt: 'ASC' },
      take: 200,
    });
  }

  async getRemainingRefundable(
    paymentId: string,
  ): Promise<{ payment: Payment; remaining: string }> {
    const payment = await this.paymentRepository.findOne({
      where: { id: paymentId },
    });
    if (!payment) throw new RefundNotFoundError();
    const remaining = await this.computeRemaining(
      this.refundRepository.manager,
      payment,
    );
    return { payment, remaining: remaining.toFixed(3) };
  }

  /** Sum of amounts still "claimed" against the payment — see RESERVING_REFUND_STATUSES. */
  private async computeReserved(
    manager: EntityManager,
    paymentId: string,
  ): Promise<number> {
    const rows = await manager
      .getRepository(Refund)
      .createQueryBuilder('r')
      .select('COALESCE(SUM(r.amount), 0)', 'total')
      .where('r.paymentId = :paymentId', { paymentId })
      .andWhere('r.status IN (:...statuses)', {
        statuses: RESERVING_REFUND_STATUSES,
      })
      .getRawOne<{ total: string }>();
    return Number(rows?.total ?? 0);
  }

  private async computeRemaining(
    manager: EntityManager,
    payment: Payment,
  ): Promise<number> {
    const reserved = await this.computeReserved(manager, payment.id);
    return Number(payment.amount) - reserved;
  }

  private async findByIdempotencyKey(
    paymentId: string,
    idempotencyKey: string | undefined,
  ): Promise<Refund | null> {
    if (!idempotencyKey) return null;
    return this.refundRepository.findOne({
      where: { paymentId, idempotencyKey },
    });
  }

  private isDuplicateIdempotencyKeyError(error: unknown): boolean {
    return (
      error instanceof QueryFailedError &&
      (error as unknown as { code?: string }).code === 'ER_DUP_ENTRY'
    );
  }

  private async insertHistory(
    manager: EntityManager,
    refund: Pick<Refund, 'id' | 'status'>,
    fromStatus: RefundStatus | null,
    reason: string | null,
    actor: string,
  ): Promise<void> {
    await manager.getRepository(RefundStatusHistory).insert({
      refundId: refund.id,
      fromStatus,
      toStatus: refund.status,
      reason,
      actor,
    });
  }

  private toEvent(
    refund: Refund,
    payment: Payment,
    reason: string | null,
  ): RefundEvent {
    return {
      refundId: refund.id,
      paymentId: payment.id,
      orderId: payment.orderId,
      provider: payment.provider,
      userId: payment.userId,
      callerApplication: payment.callerApplication,
      amount: refund.amount,
      currency: refund.currency,
      reason,
    };
  }

  /**
   * A partial-amount refund can never be dispatched automatically to
   * Flouci: its refund_payment endpoint documents no partial-amount
   * parameter and always refunds the payment's full amount. Dispatching it
   * anyway would refund more than the caller asked for. So "automated" only
   * applies when the requested amount closes out the payment entirely, on a
   * payment provider that supports it at all.
   */
  private canAutoRefund(
    payment: Payment,
    requestedAmount: number,
    reservedBeforeThisRefund: number,
  ): boolean {
    return (
      AUTO_REFUNDABLE_PROVIDERS.has(payment.provider) &&
      reservedBeforeThisRefund === 0 &&
      requestedAmount === Number(payment.amount)
    );
  }

  /**
   * TASK-P0-001 (todo.md). Creates a refund request for `paymentId`,
   * validating the remaining refundable amount under a row lock (so two
   * concurrent partial-refund requests can never together exceed the
   * payment's amount), then dispatches it: an automated provider call for
   * Flouci full refunds, MANUAL_REVIEW for everything else — never a
   * simulated success.
   */
  async createRefund(
    paymentId: string,
    dto: CreateRefundDto,
    callerApplication: string,
    idempotencyKey?: string,
  ): Promise<Refund> {
    const existing = await this.findByIdempotencyKey(paymentId, idempotencyKey);
    if (existing) {
      this.logger.log(
        `Idempotent replay of refund request for payment ${paymentId}, returning refund ${existing.id}.`,
      );
      return existing;
    }

    let refund: Refund;
    let payment: Payment;
    try {
      const result = await this.dataSource.transaction(async (manager) => {
        const lockedPayment = await manager
          .createQueryBuilder(Payment, 'p')
          .setLock('pessimistic_write')
          .where('p.id = :id', { id: paymentId })
          .getOne();
        if (!lockedPayment) throw new RefundNotFoundError();
        if (lockedPayment.status !== PaymentStatus.PAID) {
          throw new RefundPaymentNotPaidError();
        }

        const reserved = await this.computeReserved(manager, paymentId);
        const remaining = Number(lockedPayment.amount) - reserved;
        const requestedAmount = dto.amount ?? remaining;

        if (requestedAmount <= 0 || requestedAmount > remaining) {
          throw new RefundAmountExceedsRemainingError(
            remaining.toFixed(3),
            lockedPayment.currency,
          );
        }

        const refundRepo = manager.getRepository(Refund);
        const created = refundRepo.create({
          paymentId,
          provider: lockedPayment.provider,
          idempotencyKey: idempotencyKey ?? null,
          amount: requestedAmount.toFixed(3),
          currency: lockedPayment.currency,
          status: RefundStatus.REQUESTED,
          reason: dto.reason,
          initiatedByApplication: callerApplication,
          initiatedByUser: dto.initiatedByUser ?? null,
        });
        await refundRepo.save(created);
        await this.insertHistory(
          manager,
          created,
          null,
          dto.reason,
          `${callerApplication}:init`,
        );

        await this.dispatchWithinTransaction(
          manager,
          created,
          lockedPayment,
          reserved,
        );

        return { refund: created, payment: lockedPayment };
      });
      refund = result.refund;
      payment = result.payment;
    } catch (error) {
      if (this.isDuplicateIdempotencyKeyError(error)) {
        const raced = await this.findByIdempotencyKey(
          paymentId,
          idempotencyKey,
        );
        if (raced) return raced;
      }
      throw error;
    }

    if (refund.status === RefundStatus.PROCESSING) {
      await this.attemptAutomatedRefund(refund, payment);
      return this.findById(refund.id);
    }

    return refund;
  }

  /**
   * Decides REQUESTED -> PROCESSING (Flouci will be called right after the
   * transaction commits, see attemptAutomatedRefund) or REQUESTED ->
   * MANUAL_REVIEW (committed here, nothing further to dispatch). Runs
   * inside the same transaction/lock as the insert so the routing decision
   * is made against a consistent view of "how much is already reserved".
   */
  private async dispatchWithinTransaction(
    manager: EntityManager,
    refund: Refund,
    payment: Payment,
    reservedBeforeThisRefund: number,
  ): Promise<void> {
    const refundRepo = manager.getRepository(Refund);

    if (
      this.canAutoRefund(
        payment,
        Number(refund.amount),
        reservedBeforeThisRefund,
      )
    ) {
      refund.status = RefundStatus.PROCESSING;
      await refundRepo.update(refund.id, { status: RefundStatus.PROCESSING });
      await this.insertHistory(
        manager,
        refund,
        RefundStatus.REQUESTED,
        'Dispatching to provider for automated refund.',
        'payment-api:refund-dispatch',
      );
      return;
    }

    const manualReviewReason = this.explainManualReview(
      payment,
      Number(refund.amount),
      reservedBeforeThisRefund,
    );
    refund.status = RefundStatus.MANUAL_REVIEW;
    refund.manualReviewReason = manualReviewReason;
    await refundRepo.update(refund.id, {
      status: RefundStatus.MANUAL_REVIEW,
      manualReviewReason,
    });
    await this.insertHistory(
      manager,
      refund,
      RefundStatus.REQUESTED,
      manualReviewReason,
      'payment-api:refund-dispatch',
    );
    await this.outboxService.enqueue(manager, {
      eventType: REFUND_MANUAL_REVIEW_EVENT_TYPE,
      aggregateId: refund.id,
      payload: this.toEvent(
        refund,
        payment,
        manualReviewReason,
      ) as unknown as Record<string, unknown>,
    });
  }

  private explainManualReview(
    payment: Payment,
    requestedAmount: number,
    reservedBeforeThisRefund: number,
  ): string {
    if (!AUTO_REFUNDABLE_PROVIDERS.has(payment.provider)) {
      return `${payment.provider} does not expose an automated refund API; process manually and confirm via POST /refunds/:id/confirm.`;
    }
    if (reservedBeforeThisRefund > 0) {
      return 'Flouci only refunds a payment in full and this payment already has another refund in progress or completed; process manually.';
    }
    return `Flouci only refunds a payment in full; ${requestedAmount} is a partial amount. Process manually and confirm via POST /refunds/:id/confirm.`;
  }

  /**
   * Calls Flouci after the creating transaction has committed (never holds
   * the payment row lock across an external HTTP call), then records the
   * outcome in its own transaction. Never throws to the HTTP caller for a
   * provider-side failure — that's a legitimate terminal FAILED refund, not
   * a 500; ops can retry via POST /refunds/:id/retry.
   */
  private async attemptAutomatedRefund(
    refund: Refund,
    payment: Payment,
  ): Promise<void> {
    try {
      const result = await this.flouciProvider.refundPayment(
        payment.providerRef ?? '',
      );
      await this.dataSource.transaction(async (manager) => {
        await manager.getRepository(Refund).update(refund.id, {
          status: RefundStatus.SUCCEEDED,
          providerRefundRef: result.providerRefundRef,
          lastProviderStatus: result.providerStatus,
          succeededAt: new Date(),
        });
        await this.insertHistory(
          manager,
          { id: refund.id, status: RefundStatus.SUCCEEDED },
          RefundStatus.PROCESSING,
          null,
          'payment-api:flouci-refund',
        );
        await this.outboxService.enqueue(manager, {
          eventType: REFUND_SUCCEEDED_EVENT_TYPE,
          aggregateId: refund.id,
          payload: this.toEvent(refund, payment, null) as unknown as Record<
            string,
            unknown
          >,
        });
      });
      this.logger.log(`Refund ${refund.id} succeeded via Flouci.`);
    } catch (error) {
      const message =
        error instanceof FlouciError
          ? error.message
          : 'Unexpected error calling Flouci.';
      if (!(error instanceof FlouciError)) {
        this.logger.error(
          `Refund ${refund.id}: unexpected (non-Flouci) error during automated refund`,
          error instanceof Error ? error.stack : String(error),
        );
      }
      this.logger.warn(`Refund ${refund.id} failed via Flouci: ${message}`);
      await this.dataSource.transaction(async (manager) => {
        await manager.getRepository(Refund).update(refund.id, {
          status: RefundStatus.FAILED,
          failureReason: message,
        });
        await this.insertHistory(
          manager,
          { id: refund.id, status: RefundStatus.FAILED },
          RefundStatus.PROCESSING,
          message,
          'payment-api:flouci-refund',
        );
        await this.outboxService.enqueue(manager, {
          eventType: REFUND_FAILED_EVENT_TYPE,
          aggregateId: refund.id,
          payload: this.toEvent(refund, payment, message) as unknown as Record<
            string,
            unknown
          >,
        });
      });
    }
  }

  /**
   * Operator reconciliation: re-attempts a FAILED refund. Re-runs the same
   * routing decision as creation (a Flouci refund retries the provider
   * call; anything else — or a Flouci refund that no longer qualifies for
   * automation, e.g. another refund succeeded meanwhile — goes back to
   * MANUAL_REVIEW rather than silently doing nothing).
   */
  async retryRefund(refundId: string): Promise<Refund> {
    const { refund, payment } = await this.dataSource.transaction(
      async (manager) => {
        const refundRepo = manager.getRepository(Refund);
        const current = await refundRepo.findOne({ where: { id: refundId } });
        if (!current) throw new RefundNotFoundError();
        if (current.status !== RefundStatus.FAILED) {
          throw new RefundInvalidStateError('retry', current.status);
        }

        const lockedPayment = await manager
          .createQueryBuilder(Payment, 'p')
          .setLock('pessimistic_write')
          .where('p.id = :id', { id: current.paymentId })
          .getOne();
        if (!lockedPayment) throw new RefundNotFoundError();

        const reservedExcludingThis = await this.computeReservedExcluding(
          manager,
          current.paymentId,
          current.id,
        );

        current.status = RefundStatus.REQUESTED;
        await refundRepo.update(current.id, { status: RefundStatus.REQUESTED });
        await this.insertHistory(
          manager,
          current,
          RefundStatus.FAILED,
          'Operator-triggered retry.',
          'payment-api:refund-retry',
        );

        await this.dispatchWithinTransaction(
          manager,
          current,
          lockedPayment,
          reservedExcludingThis,
        );

        return { refund: current, payment: lockedPayment };
      },
    );

    if (refund.status === RefundStatus.PROCESSING) {
      await this.attemptAutomatedRefund(refund, payment);
      return this.findById(refund.id);
    }
    return refund;
  }

  private async computeReservedExcluding(
    manager: EntityManager,
    paymentId: string,
    excludeRefundId: string,
  ): Promise<number> {
    const rows = await manager
      .getRepository(Refund)
      .createQueryBuilder('r')
      .select('COALESCE(SUM(r.amount), 0)', 'total')
      .where('r.paymentId = :paymentId', { paymentId })
      .andWhere('r.id != :excludeRefundId', { excludeRefundId })
      .andWhere('r.status IN (:...statuses)', {
        statuses: RESERVING_REFUND_STATUSES,
      })
      .getRawOne<{ total: string }>();
    return Number(rows?.total ?? 0);
  }

  /**
   * Operator confirms a MANUAL_REVIEW (or previously FAILED) refund was
   * actually completed outside payment-api (e.g. a manual bank transfer for
   * Konnect/Paymee). Idempotent: confirming an already-SUCCEEDED refund
   * just returns it, without re-emitting the event.
   */
  async confirmManualRefund(
    refundId: string,
    dto: ResolveRefundDto,
  ): Promise<Refund> {
    return this.dataSource.transaction(async (manager) => {
      const refundRepo = manager.getRepository(Refund);
      const refund = await refundRepo.findOne({ where: { id: refundId } });
      if (!refund) throw new RefundNotFoundError();
      if (refund.status === RefundStatus.SUCCEEDED) return refund;
      if (
        refund.status !== RefundStatus.MANUAL_REVIEW &&
        refund.status !== RefundStatus.FAILED
      ) {
        throw new RefundInvalidStateError('confirm', refund.status);
      }

      const fromStatus = refund.status;
      refund.status = RefundStatus.SUCCEEDED;
      refund.resolvedByUser = dto.resolvedByUser;
      refund.resolutionNote = dto.note;
      refund.succeededAt = new Date();
      await refundRepo.update(refund.id, {
        status: refund.status,
        resolvedByUser: refund.resolvedByUser,
        resolutionNote: refund.resolutionNote,
        succeededAt: refund.succeededAt,
      });
      await this.insertHistory(
        manager,
        refund,
        fromStatus,
        dto.note,
        `operator:${dto.resolvedByUser}`,
      );

      const payment = await manager
        .getRepository(Payment)
        .findOne({ where: { id: refund.paymentId } });
      if (payment) {
        await this.outboxService.enqueue(manager, {
          eventType: REFUND_SUCCEEDED_EVENT_TYPE,
          aggregateId: refund.id,
          payload: this.toEvent(refund, payment, dto.note) as unknown as Record<
            string,
            unknown
          >,
        });
      }

      return refund;
    });
  }

  /** Operator rejects a MANUAL_REVIEW refund: it will not be paid out. Terminal (FAILED). */
  async rejectManualRefund(
    refundId: string,
    dto: ResolveRefundDto,
  ): Promise<Refund> {
    return this.dataSource.transaction(async (manager) => {
      const refundRepo = manager.getRepository(Refund);
      const refund = await refundRepo.findOne({ where: { id: refundId } });
      if (!refund) throw new RefundNotFoundError();
      if (refund.status === RefundStatus.FAILED) return refund;
      if (refund.status !== RefundStatus.MANUAL_REVIEW) {
        throw new RefundInvalidStateError('reject', refund.status);
      }

      refund.status = RefundStatus.FAILED;
      refund.failureReason = dto.note;
      refund.resolvedByUser = dto.resolvedByUser;
      refund.resolutionNote = dto.note;
      await refundRepo.update(refund.id, {
        status: refund.status,
        failureReason: refund.failureReason,
        resolvedByUser: refund.resolvedByUser,
        resolutionNote: refund.resolutionNote,
      });
      await this.insertHistory(
        manager,
        refund,
        RefundStatus.MANUAL_REVIEW,
        dto.note,
        `operator:${dto.resolvedByUser}`,
      );

      const payment = await manager
        .getRepository(Payment)
        .findOne({ where: { id: refund.paymentId } });
      if (payment) {
        await this.outboxService.enqueue(manager, {
          eventType: REFUND_FAILED_EVENT_TYPE,
          aggregateId: refund.id,
          payload: this.toEvent(refund, payment, dto.note) as unknown as Record<
            string,
            unknown
          >,
        });
      }

      return refund;
    });
  }
}

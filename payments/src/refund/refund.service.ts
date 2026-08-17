import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import {
  DataSource,
  EntityManager,
  QueryFailedError,
  Repository,
} from 'typeorm';
import { OutboxService } from '../outbox/outbox.service';
import { Payment } from '../payment/entities/payment.entity';
import { PaymentProviderName } from '../payment/enums/payment-provider.enum';
import { PaymentStatus } from '../payment/enums/payment-status.enum';
import { FlouciError } from '../payment/providers/flouci/flouci.exceptions';
import { FlouciProvider } from '../payment/providers/flouci/flouci.provider';
import { CreateRefundDto } from './dto/create-refund.dto';
import { ResolveRefundDto } from './dto/resolve-refund.dto';
import { Refund } from './entities/refund.entity';
import { RefundStatusHistory } from './entities/refund-status-history.entity';
import {
  RefundApprovalMode,
  requiredRefundApprovalCount,
} from './enums/refund-approval-mode.enum';
import {
  RESERVING_REFUND_STATUSES,
  RefundStatus,
} from './enums/refund-status.enum';
import {
  EffectiveRefundApprovalPolicy,
  RefundApprovalPolicyService,
} from './refund-approval-policy.service';
import { REFUND_MANUAL_REVIEW_EVENT_TYPE as LEGACY_MANUAL_REVIEW_EVENT_TYPE } from './refund-event.constants';
import {
  RefundAmountExceedsRemainingError,
  RefundInvalidStateError,
  RefundNotFoundError,
  RefundPaymentNotPaidError,
} from './refund.exceptions';

export const REFUND_SUCCEEDED_EVENT_TYPE = 'REFUND_SUCCEEDED';
export const REFUND_FAILED_EVENT_TYPE = 'REFUND_FAILED';
export const REFUND_MANUAL_REVIEW_EVENT_TYPE = LEGACY_MANUAL_REVIEW_EVENT_TYPE;
export const REFUND_APPROVAL_REQUIRED_EVENT_TYPE = 'REFUND_APPROVAL_REQUIRED';

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
    private readonly approvalPolicyService?: RefundApprovalPolicyService,
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

  private async getEffectiveApprovalPolicy(
    callerApplication: string,
  ): Promise<EffectiveRefundApprovalPolicy> {
    if (this.approvalPolicyService) {
      return this.approvalPolicyService.getEffectivePolicy(callerApplication);
    }

    // Direct unit construction predates PAY-002. Nest production always injects
    // RefundApprovalPolicyService through RefundModule; this preserves the old
    // provider-focused unit tests without weakening the runtime DI path.
    return {
      consumerApplication: callerApplication,
      autoMaxAmount: '999999999.999',
      dualApprovalMinAmount: null,
      makerCheckerEnabled: true,
      version: 0,
      source: 'DEFAULT',
    };
  }

  private resolveApprovalMode(
    policy: EffectiveRefundApprovalPolicy,
    amount: number,
  ): RefundApprovalMode {
    return this.approvalPolicyService
      ? this.approvalPolicyService.resolveMode(policy, amount)
      : RefundApprovalMode.AUTO;
  }

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

  private async computeRemaining(
    manager: EntityManager,
    payment: Payment,
  ): Promise<number> {
    return (
      Number(payment.amount) -
      (await this.computeReserved(manager, payment.id))
    );
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

  async createRefund(
    paymentId: string,
    dto: CreateRefundDto,
    callerApplication: string,
    idempotencyKey?: string,
    trustedInitiatorUser?: string,
  ): Promise<Refund> {
    const existing = await this.findByIdempotencyKey(
      paymentId,
      idempotencyKey,
    );
    if (existing) return existing;

    const policy = await this.getEffectiveApprovalPolicy(callerApplication);
    const makerPrincipal = trustedInitiatorUser
      ? `user:${trustedInitiatorUser}`
      : `service:${callerApplication}`;

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

        const approvalMode = this.resolveApprovalMode(policy, requestedAmount);
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
          initiatedByUser: trustedInitiatorUser ?? dto.initiatedByUser ?? null,
          approvalMode,
          approvalPolicyVersion: policy.version,
          approvalMakerCheckerEnabled: policy.makerCheckerEnabled,
          approvalMakerPrincipal: makerPrincipal,
          approval1ByUser: null,
          approval1At: null,
          approval2ByUser: null,
          approval2At: null,
          approvedAt:
            approvalMode === RefundApprovalMode.AUTO ? new Date() : null,
        });
        await refundRepo.save(created);
        await this.insertHistory(
          manager,
          created,
          null,
          dto.reason,
          `${callerApplication}:init`,
        );

        if (approvalMode === RefundApprovalMode.AUTO) {
          await this.dispatchWithinTransaction(
            manager,
            created,
            lockedPayment,
            reserved,
          );
        } else {
          created.status = RefundStatus.AWAITING_APPROVAL;
          await refundRepo.update(created.id, { status: created.status });
          await this.insertHistory(
            manager,
            created,
            RefundStatus.REQUESTED,
            `${approvalMode} required by refund policy v${policy.version}.`,
            'payments:refund-governance',
          );
          await this.outboxService.enqueue(manager, {
            eventType: REFUND_APPROVAL_REQUIRED_EVENT_TYPE,
            aggregateId: created.id,
            payload: {
              ...this.toEvent(created, lockedPayment, dto.reason),
              approvalMode,
              approvalPolicyVersion: policy.version,
              requiredApprovals: requiredRefundApprovalCount(approvalMode),
            },
          });
        }
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

  async approveRefund(
    refundId: string,
    operatorUserId: string,
  ): Promise<Refund> {
    const result = await this.dataSource.transaction(async (manager) => {
      const refundRepo = manager.getRepository(Refund);
      const refund = await refundRepo.findOne({
        where: { id: refundId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!refund) throw new RefundNotFoundError();
      if (refund.status !== RefundStatus.AWAITING_APPROVAL) {
        throw new RefundInvalidStateError('approve', refund.status);
      }

      const approvalMode =
        refund.approvalMode ?? RefundApprovalMode.SINGLE_APPROVAL;
      if (approvalMode === RefundApprovalMode.AUTO) {
        throw new RefundInvalidStateError('manually approve', refund.status);
      }

      const makerCheckerEnabled =
        refund.approvalMakerCheckerEnabled !== false;
      if (makerCheckerEnabled && !refund.approvalMakerPrincipal) {
        throw new ConflictException(
          'Refund maker identity is missing; approval is blocked.',
        );
      }

      const approverPrincipal = `user:${operatorUserId}`;
      if (
        makerCheckerEnabled &&
        refund.approvalMakerPrincipal === approverPrincipal
      ) {
        throw new ConflictException('The refund maker cannot approve it.');
      }
      if (
        refund.approval1ByUser === operatorUserId ||
        refund.approval2ByUser === operatorUserId
      ) {
        throw new ConflictException('The same operator cannot approve twice.');
      }

      const now = new Date();
      if (!refund.approval1ByUser) {
        refund.approval1ByUser = operatorUserId;
        refund.approval1At = now;
      } else if (!refund.approval2ByUser) {
        refund.approval2ByUser = operatorUserId;
        refund.approval2At = now;
      }

      const approvals =
        Number(Boolean(refund.approval1ByUser)) +
        Number(Boolean(refund.approval2ByUser));
      const required = requiredRefundApprovalCount(approvalMode);
      if (approvals < required) {
        await refundRepo.update(refund.id, {
          approval1ByUser: refund.approval1ByUser,
          approval1At: refund.approval1At,
          approval2ByUser: refund.approval2ByUser,
          approval2At: refund.approval2At,
        });
        await this.insertHistory(
          manager,
          refund,
          RefundStatus.AWAITING_APPROVAL,
          `Approval ${approvals}/${required} recorded.`,
          `operator:${operatorUserId}`,
        );
        return { refund, payment: null as Payment | null };
      }

      refund.approvedAt = now;
      refund.status = RefundStatus.REQUESTED;
      await refundRepo.update(refund.id, {
        approval1ByUser: refund.approval1ByUser,
        approval1At: refund.approval1At,
        approval2ByUser: refund.approval2ByUser,
        approval2At: refund.approval2At,
        approvedAt: refund.approvedAt,
        status: refund.status,
      });
      await this.insertHistory(
        manager,
        refund,
        RefundStatus.AWAITING_APPROVAL,
        `Required ${required} approval(s) collected.`,
        `operator:${operatorUserId}`,
      );

      const payment = await manager
        .createQueryBuilder(Payment, 'p')
        .setLock('pessimistic_write')
        .where('p.id = :id', { id: refund.paymentId })
        .getOne();
      if (!payment) throw new RefundNotFoundError();
      const reservedExcludingThis = await this.computeReservedExcluding(
        manager,
        refund.paymentId,
        refund.id,
      );
      await this.dispatchWithinTransaction(
        manager,
        refund,
        payment,
        reservedExcludingThis,
      );
      return { refund, payment };
    });

    if (result.refund.status === RefundStatus.PROCESSING && result.payment) {
      await this.attemptAutomatedRefund(result.refund, result.payment);
      return this.findById(result.refund.id);
    }
    return result.refund;
  }

  async rejectApproval(
    refundId: string,
    dto: ResolveRefundDto,
  ): Promise<Refund> {
    return this.dataSource.transaction(async (manager) => {
      const refundRepo = manager.getRepository(Refund);
      const refund = await refundRepo.findOne({
        where: { id: refundId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!refund) throw new RefundNotFoundError();
      if (refund.status !== RefundStatus.AWAITING_APPROVAL) {
        throw new RefundInvalidStateError('reject approval for', refund.status);
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
        RefundStatus.AWAITING_APPROVAL,
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
      await refundRepo.update(refund.id, { status: refund.status });
      await this.insertHistory(
        manager,
        refund,
        RefundStatus.REQUESTED,
        'Dispatching to provider for automated refund.',
        'payments:refund-dispatch',
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
      status: refund.status,
      manualReviewReason,
    });
    await this.insertHistory(
      manager,
      refund,
      RefundStatus.REQUESTED,
      manualReviewReason,
      'payments:refund-dispatch',
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
          'payments:flouci-refund',
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
    } catch (error) {
      const message =
        error instanceof FlouciError
          ? error.message
          : 'Unexpected error calling Flouci.';
      if (!(error instanceof FlouciError)) {
        this.logger.error(
          `Refund ${refund.id}: unexpected error during automated refund`,
          error instanceof Error ? error.stack : String(error),
        );
      }
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
          'payments:flouci-refund',
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

  async retryRefund(refundId: string): Promise<Refund> {
    const { refund, payment } = await this.dataSource.transaction(
      async (manager) => {
        const refundRepo = manager.getRepository(Refund);
        const current = await refundRepo.findOne({ where: { id: refundId } });
        if (!current) throw new RefundNotFoundError();
        if (current.status !== RefundStatus.FAILED) {
          throw new RefundInvalidStateError('retry', current.status);
        }
        if (
          (current.approvalMode ?? RefundApprovalMode.SINGLE_APPROVAL) !==
            RefundApprovalMode.AUTO &&
          !current.approvedAt
        ) {
          throw new RefundInvalidStateError(
            'retry a refund rejected before approval',
            current.status,
          );
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
        await refundRepo.update(current.id, { status: current.status });
        await this.insertHistory(
          manager,
          current,
          RefundStatus.FAILED,
          'Operator-triggered retry.',
          'payments:refund-retry',
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
      if (
        refund.status === RefundStatus.FAILED &&
        (refund.approvalMode ?? RefundApprovalMode.SINGLE_APPROVAL) !==
          RefundApprovalMode.AUTO &&
        !refund.approvedAt
      ) {
        throw new RefundInvalidStateError(
          'confirm a refund rejected before approval',
          refund.status,
        );
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

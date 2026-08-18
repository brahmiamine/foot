import { createHash } from 'crypto';
import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, LessThan, Repository } from 'typeorm';
import { ListPaymentReconciliationCasesQueryDto } from './dto/list-payment-reconciliation-cases-query.dto';
import { ResolvePaymentReconciliationCaseDto } from './dto/resolve-payment-reconciliation-case.dto';
import { PaymentReconciliationCase } from './entities/payment-reconciliation-case.entity';
import { PaymentReconciliationEvent } from './entities/payment-reconciliation-event.entity';
import { Payment } from './entities/payment.entity';
import { PaymentProviderName } from './enums/payment-provider.enum';
import { PaymentStatus } from './enums/payment-status.enum';
import {
  PaymentReconciliationCaseStatus,
  PaymentReconciliationDiscrepancyType,
  PaymentReconciliationEventAction,
  PaymentReconciliationEvidenceSource,
  PaymentReconciliationResolutionAction,
} from './payment-reconciliation.enums';
import { PaymentService } from './payment.service';

const POLL_INTERVAL_MS = 60 * 60 * 1000;
const STALE_THRESHOLD_MS = 60 * 60 * 1000;
const BATCH_SIZE = 50;
const STILL_PENDING_ALERT_THRESHOLD = 10;

export interface ReconciliationReport {
  staleCount: number;
  resolvedCount: number;
  stillPendingCount: number;
  openCaseCount: number;
  timestamp: string;
}

export interface PaymentReconciliationActor {
  application: string;
  userId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

interface DiscrepancyInput {
  type: PaymentReconciliationDiscrepancyType;
  evidenceSource: PaymentReconciliationEvidenceSource;
  providerStatus: string | null;
  mappedProviderStatus: PaymentStatus | null;
  detail: string | null;
}

const SYSTEM_ACTOR: PaymentReconciliationActor = {
  application: 'payments',
  userId: null,
  ipAddress: null,
  userAgent: null,
};

@Injectable()
export class PaymentReconciliationService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PaymentReconciliationService.name);
  private timer: NodeJS.Timeout | null = null;
  private isRunning = false;
  private lastReport: ReconciliationReport | null = null;

  constructor(
    @InjectRepository(Payment)
    private readonly repository: Repository<Payment>,
    @InjectRepository(PaymentReconciliationCase)
    private readonly caseRepository: Repository<PaymentReconciliationCase>,
    @InjectRepository(PaymentReconciliationEvent)
    private readonly eventRepository: Repository<PaymentReconciliationEvent>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly paymentService: PaymentService,
  ) {}

  onModuleInit(): void {
    this.timer = setInterval(() => {
      void this.reconcileStalePayments();
    }, POLL_INTERVAL_MS);
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  getLastReport(): ReconciliationReport | null {
    return this.lastReport;
  }

  async listCases(
    query: ListPaymentReconciliationCasesQueryDto,
  ): Promise<PaymentReconciliationCase[]> {
    const qb = this.caseRepository
      .createQueryBuilder('reconciliationCase')
      .orderBy('reconciliationCase.lastCheckedAt', 'DESC')
      .addOrderBy('reconciliationCase.createdAt', 'DESC')
      .take(query.limit ?? 200);

    if (query.status) {
      qb.andWhere('reconciliationCase.status = :status', {
        status: query.status,
      });
    }
    if (query.provider) {
      qb.andWhere('reconciliationCase.provider = :provider', {
        provider: query.provider,
      });
    }
    if (query.consumerApplication) {
      qb.andWhere(
        'reconciliationCase.consumerApplication = :consumerApplication',
        { consumerApplication: query.consumerApplication },
      );
    }
    return qb.getMany();
  }

  async getCaseBundle(id: string): Promise<{
    reconciliationCase: PaymentReconciliationCase;
    events: PaymentReconciliationEvent[];
  }> {
    const reconciliationCase = await this.caseRepository.findOne({
      where: { id },
    });
    if (!reconciliationCase) {
      throw new NotFoundException('Payment reconciliation case not found');
    }
    const events = await this.eventRepository.find({
      where: { caseId: id },
      order: { createdAt: 'ASC' },
    });
    return { reconciliationCase, events };
  }

  async reconcileStalePayments(
    actor: PaymentReconciliationActor = SYSTEM_ACTOR,
  ): Promise<ReconciliationReport> {
    const timestamp = new Date().toISOString();
    if (this.isRunning) {
      return (
        this.lastReport ?? {
          staleCount: 0,
          resolvedCount: 0,
          stillPendingCount: 0,
          openCaseCount: await this.caseRepository.count({
            where: { status: PaymentReconciliationCaseStatus.OPEN },
          }),
          timestamp,
        }
      );
    }
    this.isRunning = true;

    try {
      const staleCutoff = new Date(Date.now() - STALE_THRESHOLD_MS);
      const stalePayments = await this.repository.find({
        where: {
          status: PaymentStatus.PENDING,
          createdAt: LessThan(staleCutoff),
        },
        order: { createdAt: 'ASC' },
        take: BATCH_SIZE,
      });

      let resolvedCount = 0;
      for (const payment of stalePayments) {
        await this.reconcileOne(
          payment,
          actor,
          PaymentReconciliationEventAction.CHECKED,
        );
        const reloaded = await this.repository.findOne({
          where: { id: payment.id },
        });
        if (reloaded && reloaded.status !== PaymentStatus.PENDING) {
          resolvedCount += 1;
        }
      }

      const stillPendingCount = stalePayments.length - resolvedCount;
      const openCaseCount = await this.caseRepository.count({
        where: { status: PaymentReconciliationCaseStatus.OPEN },
      });
      const report: ReconciliationReport = {
        staleCount: stalePayments.length,
        resolvedCount,
        stillPendingCount,
        openCaseCount,
        timestamp,
      };
      this.lastReport = report;

      this.logger.log(`Payment reconciliation: ${JSON.stringify(report)}`);
      if (
        stillPendingCount > STILL_PENDING_ALERT_THRESHOLD ||
        openCaseCount > STILL_PENDING_ALERT_THRESHOLD
      ) {
        this.logger.error(
          `Reconciliation alert: ${stillPendingCount} stale payments remain PENDING and ${openCaseCount} reconciliation cases are OPEN.`,
        );
      }

      return report;
    } finally {
      this.isRunning = false;
    }
  }

  async recheckCase(
    id: string,
    actor: PaymentReconciliationActor,
  ): Promise<{
    reconciliationCase: PaymentReconciliationCase;
    events: PaymentReconciliationEvent[];
  }> {
    const reconciliationCase = await this.caseRepository.findOne({
      where: { id },
    });
    if (!reconciliationCase) {
      throw new NotFoundException('Payment reconciliation case not found');
    }
    const payment = await this.repository.findOne({
      where: { id: reconciliationCase.paymentId },
    });
    if (!payment) throw new NotFoundException('Payment not found');

    await this.reconcileOne(
      payment,
      actor,
      PaymentReconciliationEventAction.RECHECKED,
    );
    return this.getCaseBundle(id);
  }

  async resolveCase(
    id: string,
    dto: ResolvePaymentReconciliationCaseDto,
    actor: PaymentReconciliationActor,
  ): Promise<PaymentReconciliationCase> {
    return this.dataSource.transaction(async (manager) => {
      const caseRepo = manager.getRepository(PaymentReconciliationCase);
      const reconciliationCase = await caseRepo.findOne({
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!reconciliationCase) {
        throw new NotFoundException('Payment reconciliation case not found');
      }
      if (reconciliationCase.status !== PaymentReconciliationCaseStatus.OPEN) {
        throw new ConflictException('Reconciliation case is already resolved');
      }
      const note = dto.note.trim();
      const beforeState = this.caseSnapshot(reconciliationCase);
      reconciliationCase.status = PaymentReconciliationCaseStatus.RESOLVED;
      reconciliationCase.resolvedAt = new Date();
      reconciliationCase.resolutionAction = dto.action;
      reconciliationCase.resolvedByApplication = actor.application;
      reconciliationCase.resolvedByUser = actor.userId ?? null;
      reconciliationCase.resolutionNote = note;
      const saved = await caseRepo.save(reconciliationCase);
      await this.insertAuditEvent(
        manager,
        saved.id,
        PaymentReconciliationEventAction.RESOLVED,
        actor,
        note,
        beforeState,
        this.caseSnapshot(saved),
      );
      return saved;
    });
  }

  private async reconcileOne(
    payment: Payment,
    actor: PaymentReconciliationActor,
    eventAction:
      | PaymentReconciliationEventAction.CHECKED
      | PaymentReconciliationEventAction.RECHECKED,
  ): Promise<void> {
    if (!payment.providerRef) {
      await this.upsertDiscrepancy(
        payment,
        {
          type: PaymentReconciliationDiscrepancyType.MISSING_PROVIDER_REFERENCE,
          evidenceSource: PaymentReconciliationEvidenceSource.NONE,
          providerStatus: null,
          mappedProviderStatus: null,
          detail: 'The payment has no provider reference to reconcile.',
        },
        actor,
        eventAction,
      );
      return;
    }

    if (payment.provider === PaymentProviderName.PAYMEE) {
      await this.reconcilePaymee(payment, actor, eventAction);
      return;
    }

    try {
      if (payment.provider === PaymentProviderName.KONNECT) {
        await this.paymentService.handleKonnectWebhook(payment.providerRef);
      } else if (payment.provider === PaymentProviderName.FLOUCI) {
        await this.paymentService.handleFlouciWebhook(payment.providerRef);
      } else {
        await this.upsertDiscrepancy(
          payment,
          {
            type: PaymentReconciliationDiscrepancyType.PROVIDER_EVIDENCE_UNAVAILABLE,
            evidenceSource: PaymentReconciliationEvidenceSource.NONE,
            providerStatus: this.safeProviderStatus(payment.lastProviderStatus),
            mappedProviderStatus: null,
            detail: `Provider ${payment.provider} has no reconciliation adapter.`,
          },
          actor,
          eventAction,
        );
        return;
      }

      const reloaded = await this.repository.findOne({
        where: { id: payment.id },
      });
      if (!reloaded) throw new NotFoundException('Payment not found');
      if (reloaded.status !== PaymentStatus.PENDING) {
        await this.autoResolve(
          payment.id,
          `Live provider verification reconciled payment to ${reloaded.status}.`,
          actor,
        );
        return;
      }

      await this.upsertDiscrepancy(
        reloaded,
        {
          type: PaymentReconciliationDiscrepancyType.STALE_PENDING,
          evidenceSource: PaymentReconciliationEvidenceSource.LIVE_PROVIDER_API,
          providerStatus: this.safeProviderStatus(reloaded.lastProviderStatus),
          mappedProviderStatus: reloaded.status,
          detail:
            'Live provider verification completed but the payment remains PENDING.',
        },
        actor,
        eventAction,
      );
    } catch (error) {
      await this.upsertDiscrepancy(
        payment,
        {
          type: PaymentReconciliationDiscrepancyType.PROVIDER_CHECK_FAILED,
          evidenceSource: PaymentReconciliationEvidenceSource.LIVE_PROVIDER_API,
          providerStatus: this.safeProviderStatus(payment.lastProviderStatus),
          mappedProviderStatus: null,
          detail: this.safeErrorMessage(error),
        },
        actor,
        eventAction,
      );
    }
  }

  private async reconcilePaymee(
    payment: Payment,
    actor: PaymentReconciliationActor,
    eventAction:
      | PaymentReconciliationEventAction.CHECKED
      | PaymentReconciliationEventAction.RECHECKED,
  ): Promise<void> {
    const rawStatus = this.safeProviderStatus(payment.lastProviderStatus);
    let mappedProviderStatus: PaymentStatus | null = null;
    if (rawStatus === 'true') mappedProviderStatus = PaymentStatus.PAID;
    if (rawStatus === 'false') mappedProviderStatus = PaymentStatus.FAILED;

    if (!mappedProviderStatus) {
      await this.upsertDiscrepancy(
        payment,
        {
          type: PaymentReconciliationDiscrepancyType.PROVIDER_EVIDENCE_UNAVAILABLE,
          evidenceSource: rawStatus
            ? PaymentReconciliationEvidenceSource.SIGNED_WEBHOOK
            : PaymentReconciliationEvidenceSource.NONE,
          providerStatus: rawStatus,
          mappedProviderStatus: null,
          detail: rawStatus
            ? 'The latest signed Paymee webhook status is not interpretable.'
            : 'No signed Paymee webhook evidence is available for this stale payment.',
        },
        actor,
        eventAction,
      );
      return;
    }

    if (mappedProviderStatus !== payment.status) {
      await this.upsertDiscrepancy(
        payment,
        {
          type: PaymentReconciliationDiscrepancyType.STATUS_MISMATCH,
          evidenceSource: PaymentReconciliationEvidenceSource.SIGNED_WEBHOOK,
          providerStatus: rawStatus,
          mappedProviderStatus,
          detail: `Signed Paymee webhook evidence maps to ${mappedProviderStatus} while internal status is ${payment.status}.`,
        },
        actor,
        eventAction,
      );
      return;
    }

    await this.autoResolve(
      payment.id,
      'Signed Paymee webhook evidence matches the internal payment status.',
      actor,
    );
  }

  private async upsertDiscrepancy(
    payment: Payment,
    discrepancy: DiscrepancyInput,
    actor: PaymentReconciliationActor,
    eventAction:
      | PaymentReconciliationEventAction.CHECKED
      | PaymentReconciliationEventAction.RECHECKED,
  ): Promise<PaymentReconciliationCase> {
    return this.dataSource.transaction(async (manager) => {
      const paymentRepo = manager.getRepository(Payment);
      const currentPayment = await paymentRepo.findOne({
        where: { id: payment.id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!currentPayment) throw new NotFoundException('Payment not found');

      const caseRepo = manager.getRepository(PaymentReconciliationCase);
      let reconciliationCase = await caseRepo.findOne({
        where: { paymentId: payment.id },
        lock: { mode: 'pessimistic_write' },
      });
      const now = new Date();
      const providerStatus = this.safeProviderStatus(discrepancy.providerStatus);
      const fingerprint = this.fingerprint(
        discrepancy.type,
        discrepancy.evidenceSource,
        currentPayment.status,
        providerStatus,
        discrepancy.mappedProviderStatus,
      );
      const beforeState = reconciliationCase
        ? this.caseSnapshot(reconciliationCase)
        : null;
      let auditAction: PaymentReconciliationEventAction;

      if (!reconciliationCase) {
        reconciliationCase = caseRepo.create({
          paymentId: currentPayment.id,
          provider: currentPayment.provider,
          consumerApplication: currentPayment.callerApplication,
          status: PaymentReconciliationCaseStatus.OPEN,
          discrepancyType: discrepancy.type,
          evidenceSource: discrepancy.evidenceSource,
          internalStatus: currentPayment.status,
          providerStatus,
          mappedProviderStatus: discrepancy.mappedProviderStatus,
          fingerprint,
          detail: discrepancy.detail,
          detectedAt: now,
          lastCheckedAt: now,
          checkCount: 1,
          resolvedAt: null,
          resolutionAction: null,
          resolvedByApplication: null,
          resolvedByUser: null,
          resolutionNote: null,
        });
        auditAction = PaymentReconciliationEventAction.OPENED;
      } else {
        const sameFingerprint = reconciliationCase.fingerprint === fingerprint;
        const shouldRemainResolved =
          reconciliationCase.status ===
            PaymentReconciliationCaseStatus.RESOLVED &&
          sameFingerprint &&
          (reconciliationCase.resolutionAction ===
            PaymentReconciliationResolutionAction.ACCEPT_INTERNAL ||
            reconciliationCase.resolutionAction ===
              PaymentReconciliationResolutionAction.DOCUMENT_EXCEPTION);

        if (
          reconciliationCase.status ===
            PaymentReconciliationCaseStatus.RESOLVED &&
          !shouldRemainResolved
        ) {
          reconciliationCase.status = PaymentReconciliationCaseStatus.OPEN;
          reconciliationCase.detectedAt = now;
          reconciliationCase.resolvedAt = null;
          reconciliationCase.resolutionAction = null;
          reconciliationCase.resolvedByApplication = null;
          reconciliationCase.resolvedByUser = null;
          reconciliationCase.resolutionNote = null;
          auditAction = PaymentReconciliationEventAction.REOPENED;
        } else {
          auditAction = eventAction;
        }

        reconciliationCase.provider = currentPayment.provider;
        reconciliationCase.consumerApplication = currentPayment.callerApplication;
        reconciliationCase.discrepancyType = discrepancy.type;
        reconciliationCase.evidenceSource = discrepancy.evidenceSource;
        reconciliationCase.internalStatus = currentPayment.status;
        reconciliationCase.providerStatus = providerStatus;
        reconciliationCase.mappedProviderStatus =
          discrepancy.mappedProviderStatus;
        reconciliationCase.fingerprint = fingerprint;
        reconciliationCase.detail = discrepancy.detail;
        reconciliationCase.lastCheckedAt = now;
        reconciliationCase.checkCount += 1;
      }

      const saved = await caseRepo.save(reconciliationCase);
      await this.insertAuditEvent(
        manager,
        saved.id,
        auditAction,
        actor,
        discrepancy.detail,
        beforeState,
        this.caseSnapshot(saved),
      );
      return saved;
    });
  }

  private async autoResolve(
    paymentId: string,
    note: string,
    actor: PaymentReconciliationActor,
  ): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      await manager.getRepository(Payment).findOne({
        where: { id: paymentId },
        lock: { mode: 'pessimistic_write' },
      });
      const caseRepo = manager.getRepository(PaymentReconciliationCase);
      const reconciliationCase = await caseRepo.findOne({
        where: { paymentId },
        lock: { mode: 'pessimistic_write' },
      });
      if (
        !reconciliationCase ||
        reconciliationCase.status === PaymentReconciliationCaseStatus.RESOLVED
      ) {
        return;
      }
      const beforeState = this.caseSnapshot(reconciliationCase);
      reconciliationCase.status = PaymentReconciliationCaseStatus.RESOLVED;
      reconciliationCase.lastCheckedAt = new Date();
      reconciliationCase.checkCount += 1;
      reconciliationCase.resolvedAt = new Date();
      reconciliationCase.resolutionAction =
        PaymentReconciliationResolutionAction.AUTO_MATCH;
      reconciliationCase.resolvedByApplication = actor.application;
      reconciliationCase.resolvedByUser = actor.userId ?? null;
      reconciliationCase.resolutionNote = note;
      const saved = await caseRepo.save(reconciliationCase);
      await this.insertAuditEvent(
        manager,
        saved.id,
        PaymentReconciliationEventAction.AUTO_RESOLVED,
        actor,
        note,
        beforeState,
        this.caseSnapshot(saved),
      );
    });
  }

  private async insertAuditEvent(
    manager: EntityManager,
    caseId: string,
    action: PaymentReconciliationEventAction,
    actor: PaymentReconciliationActor,
    note: string | null,
    beforeState: Record<string, unknown> | null,
    afterState: Record<string, unknown> | null,
  ): Promise<void> {
    await manager.getRepository(PaymentReconciliationEvent).insert({
      caseId,
      action,
      actorApplication: actor.application,
      actorUser: actor.userId ?? null,
      ipAddress: actor.ipAddress?.slice(0, 64) ?? null,
      userAgent: actor.userAgent?.slice(0, 512) ?? null,
      note,
      beforeState,
      afterState,
    });
  }

  private caseSnapshot(
    reconciliationCase: PaymentReconciliationCase,
  ): Record<string, unknown> {
    return {
      status: reconciliationCase.status,
      discrepancyType: reconciliationCase.discrepancyType,
      evidenceSource: reconciliationCase.evidenceSource,
      internalStatus: reconciliationCase.internalStatus,
      providerStatus: reconciliationCase.providerStatus,
      mappedProviderStatus: reconciliationCase.mappedProviderStatus,
      fingerprint: reconciliationCase.fingerprint,
      detail: reconciliationCase.detail,
      detectedAt: reconciliationCase.detectedAt,
      lastCheckedAt: reconciliationCase.lastCheckedAt,
      checkCount: reconciliationCase.checkCount,
      resolvedAt: reconciliationCase.resolvedAt,
      resolutionAction: reconciliationCase.resolutionAction,
      resolvedByApplication: reconciliationCase.resolvedByApplication,
      resolvedByUser: reconciliationCase.resolvedByUser,
      resolutionNote: reconciliationCase.resolutionNote,
    };
  }

  private fingerprint(
    type: PaymentReconciliationDiscrepancyType,
    evidenceSource: PaymentReconciliationEvidenceSource,
    internalStatus: PaymentStatus,
    providerStatus: string | null,
    mappedProviderStatus: PaymentStatus | null,
  ): string {
    return createHash('sha256')
      .update(
        [
          type,
          evidenceSource,
          internalStatus,
          providerStatus ?? '',
          mappedProviderStatus ?? '',
        ].join('|'),
      )
      .digest('hex');
  }

  private safeProviderStatus(value: string | null | undefined): string | null {
    const normalized = value?.trim();
    return normalized ? normalized.slice(0, 64) : null;
  }

  private safeErrorMessage(error: unknown): string {
    const message = error instanceof Error ? error.message : String(error);
    return message.slice(0, 2000);
  }
}

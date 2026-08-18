import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import {
  DataSource,
  EntityManager,
  In,
  IsNull,
  LessThanOrEqual,
  Repository,
} from 'typeorm';
import {
  NotificationClientService,
  type NotifyPayload,
} from '../notifications/notification-client.service';
import { Payment } from '../payment/entities/payment.entity';
import { Refund } from './entities/refund.entity';
import { RefundStatusHistory } from './entities/refund-status-history.entity';
import { RefundStatus } from './enums/refund-status.enum';
import { RefundManualReviewPolicyService } from './refund-manual-review-policy.service';

export type ManualReviewSlaState =
  | 'IN_SLA'
  | 'DUE_SOON'
  | 'OVERDUE'
  | 'ESCALATED'
  | 'UNSCHEDULED';

export interface ManualReviewDashboardItem {
  refundId: string;
  paymentId: string;
  orderId: string | null;
  consumerApplication: string;
  provider: string;
  amount: string;
  currency: string;
  reason: string;
  manualReviewReason: string | null;
  policyVersion: number | null;
  startedAt: Date | null;
  reminderAt: Date | null;
  reminderSentAt: Date | null;
  dueAt: Date | null;
  escalateAt: Date | null;
  escalatedAt: Date | null;
  state: ManualReviewSlaState;
  minutesToDue: number | null;
}

export interface ManualReviewDashboard {
  generatedAt: Date;
  summary: {
    total: number;
    inSla: number;
    dueSoon: number;
    overdue: number;
    escalated: number;
    unscheduled: number;
  };
  items: ManualReviewDashboardItem[];
}

export interface ManualReviewAlertRunResult {
  reminders: number;
  escalations: number;
  errors: number;
}

const BATCH_SIZE = 200;
const PLATFORM_FINANCE_ROLES = ['PLATFORM_SUPERADMIN', 'SUPERADMIN'] as const;

@Injectable()
export class RefundManualReviewSlaService {
  private readonly logger = new Logger(RefundManualReviewSlaService.name);

  constructor(
    @InjectRepository(Refund)
    private readonly refundRepository: Repository<Refund>,
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly policyService: RefundManualReviewPolicyService,
    private readonly notificationClient: NotificationClientService,
  ) {}

  async initializeSchedules(): Promise<number> {
    let initialized = 0;
    let offset = 0;
    while (true) {
      const refunds = await this.refundRepository.find({
        where: { status: RefundStatus.MANUAL_REVIEW },
        order: { id: 'ASC' },
        skip: offset,
        take: BATCH_SIZE,
      });
      for (const candidate of refunds) {
        const changed = await this.dataSource.transaction(async (manager) => {
          const refund = await manager.getRepository(Refund).findOne({
            where: { id: candidate.id },
            lock: { mode: 'pessimistic_write' },
          });
          if (!refund || refund.status !== RefundStatus.MANUAL_REVIEW) {
            return false;
          }
          return this.ensureCurrentSchedule(manager, refund);
        });
        if (changed) initialized += 1;
      }
      offset += refunds.length;
      if (refunds.length < BATCH_SIZE) break;
    }
    return initialized;
  }

  async processDueAlerts(now = new Date()): Promise<ManualReviewAlertRunResult> {
    await this.initializeSchedules();
    const candidates = await this.refundRepository.find({
      where: [
        {
          status: RefundStatus.MANUAL_REVIEW,
          manualReviewReminderAt: LessThanOrEqual(now),
          manualReviewReminderSentAt: IsNull(),
        },
        {
          status: RefundStatus.MANUAL_REVIEW,
          manualReviewEscalateAt: LessThanOrEqual(now),
          manualReviewEscalatedAt: IsNull(),
        },
      ],
      order: { manualReviewDueAt: 'ASC' },
      take: BATCH_SIZE,
    });
    const result: ManualReviewAlertRunResult = {
      reminders: 0,
      escalations: 0,
      errors: 0,
    };

    for (const candidate of candidates) {
      try {
        const processed = await this.processOne(candidate.id, now);
        result.reminders += processed.reminders;
        result.escalations += processed.escalations;
      } catch (error) {
        result.errors += 1;
        this.logger.warn(
          `Manual-review SLA alert failed for refund ${candidate.id}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
    return result;
  }

  async getDashboard(now = new Date()): Promise<ManualReviewDashboard> {
    await this.initializeSchedules();
    const refunds = await this.refundRepository.find({
      where: { status: RefundStatus.MANUAL_REVIEW },
      order: { manualReviewDueAt: 'ASC', createdAt: 'ASC' },
      take: BATCH_SIZE,
    });
    const paymentIds = [...new Set(refunds.map((refund) => refund.paymentId))];
    const payments = paymentIds.length
      ? await this.paymentRepository.find({ where: { id: In(paymentIds) } })
      : [];
    const paymentById = new Map(payments.map((payment) => [payment.id, payment]));

    const items = refunds.map((refund): ManualReviewDashboardItem => {
      const payment = paymentById.get(refund.paymentId);
      const state = this.resolveState(refund, now);
      const minutesToDue = refund.manualReviewDueAt
        ? Math.ceil((refund.manualReviewDueAt.getTime() - now.getTime()) / 60_000)
        : null;
      return {
        refundId: refund.id,
        paymentId: refund.paymentId,
        orderId: payment?.orderId ?? null,
        consumerApplication:
          payment?.callerApplication ?? refund.initiatedByApplication,
        provider: refund.provider,
        amount: refund.amount,
        currency: refund.currency,
        reason: refund.reason,
        manualReviewReason: refund.manualReviewReason,
        policyVersion: refund.manualReviewPolicyVersion ?? null,
        startedAt: refund.manualReviewStartedAt ?? null,
        reminderAt: refund.manualReviewReminderAt ?? null,
        reminderSentAt: refund.manualReviewReminderSentAt ?? null,
        dueAt: refund.manualReviewDueAt ?? null,
        escalateAt: refund.manualReviewEscalateAt ?? null,
        escalatedAt: refund.manualReviewEscalatedAt ?? null,
        state,
        minutesToDue,
      };
    });

    return {
      generatedAt: now,
      summary: {
        total: items.length,
        inSla: items.filter((item) => item.state === 'IN_SLA').length,
        dueSoon: items.filter((item) => item.state === 'DUE_SOON').length,
        overdue: items.filter((item) => item.state === 'OVERDUE').length,
        escalated: items.filter((item) => item.state === 'ESCALATED').length,
        unscheduled: items.filter((item) => item.state === 'UNSCHEDULED').length,
      },
      items,
    };
  }

  private async processOne(
    refundId: string,
    now: Date,
  ): Promise<{ reminders: number; escalations: number }> {
    return this.dataSource.transaction(async (manager) => {
      const refundRepo = manager.getRepository(Refund);
      const refund = await refundRepo.findOne({
        where: { id: refundId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!refund || refund.status !== RefundStatus.MANUAL_REVIEW) {
        return { reminders: 0, escalations: 0 };
      }

      await this.ensureCurrentSchedule(manager, refund);
      const payment = await manager
        .getRepository(Payment)
        .findOne({ where: { id: refund.paymentId } });
      if (!payment || !refund.manualReviewStartedAt) {
        return { reminders: 0, escalations: 0 };
      }

      let reminders = 0;
      let escalations = 0;
      const cycleKey = refund.manualReviewStartedAt.toISOString();

      if (
        refund.manualReviewReminderAt &&
        refund.manualReviewReminderAt <= now &&
        !refund.manualReviewReminderSentAt
      ) {
        await this.notifyPlatformFinance({
          eventId: `refund-manual-review-reminder:${refund.id}:${cycleKey}`,
          type: 'REFUND_MANUAL_REVIEW_REMINDER',
          category: 'REFUND_MANUAL_REVIEW',
          title: 'Remboursement manuel bientôt hors SLA',
          body: `Le remboursement ${refund.id} (${refund.amount} ${refund.currency}) doit être traité avant ${refund.manualReviewDueAt?.toISOString() ?? 'échéance inconnue'}.`,
          data: this.toAlertData(refund, payment),
        });
        refund.manualReviewReminderSentAt = now;
        await refundRepo.update(refund.id, {
          manualReviewReminderSentAt: now,
        });
        reminders = 1;
      }

      if (
        refund.manualReviewEscalateAt &&
        refund.manualReviewEscalateAt <= now &&
        !refund.manualReviewEscalatedAt
      ) {
        await this.notifyPlatformFinance({
          eventId: `refund-manual-review-escalation:${refund.id}:${cycleKey}`,
          type: 'REFUND_MANUAL_REVIEW_ESCALATED',
          category: 'REFUND_MANUAL_REVIEW',
          title: 'Remboursement manuel hors SLA',
          body: `Le remboursement ${refund.id} (${refund.amount} ${refund.currency}) a dépassé son SLA et requiert une intervention prioritaire.`,
          data: this.toAlertData(refund, payment),
        });
        refund.manualReviewEscalatedAt = now;
        await refundRepo.update(refund.id, {
          manualReviewEscalatedAt: now,
        });
        escalations = 1;
      }

      return { reminders, escalations };
    });
  }

  private async ensureCurrentSchedule(
    manager: EntityManager,
    refund: Refund,
  ): Promise<boolean> {
    const transition = await manager.getRepository(RefundStatusHistory).findOne({
      where: {
        refundId: refund.id,
        toStatus: RefundStatus.MANUAL_REVIEW,
      },
      order: { createdAt: 'DESC' },
    });
    const startedAt =
      transition?.createdAt ??
      refund.manualReviewStartedAt ??
      refund.updatedAt ??
      refund.createdAt;
    if (
      refund.manualReviewStartedAt &&
      refund.manualReviewStartedAt.getTime() === startedAt.getTime()
    ) {
      return false;
    }

    const policy = await this.policyService.getEffectivePolicy(
      refund.initiatedByApplication,
    );
    const dueAt = new Date(startedAt.getTime() + policy.slaMinutes * 60_000);
    const reminderAt = new Date(
      dueAt.getTime() - policy.reminderBeforeDueMinutes * 60_000,
    );
    const escalateAt = new Date(
      dueAt.getTime() + policy.escalationAfterDueMinutes * 60_000,
    );

    refund.manualReviewPolicyVersion = policy.version;
    refund.manualReviewStartedAt = startedAt;
    refund.manualReviewDueAt = dueAt;
    refund.manualReviewReminderAt = reminderAt;
    refund.manualReviewReminderSentAt = null;
    refund.manualReviewEscalateAt = escalateAt;
    refund.manualReviewEscalatedAt = null;
    await manager.getRepository(Refund).update(refund.id, {
      manualReviewPolicyVersion: policy.version,
      manualReviewStartedAt: startedAt,
      manualReviewDueAt: dueAt,
      manualReviewReminderAt: reminderAt,
      manualReviewReminderSentAt: null,
      manualReviewEscalateAt: escalateAt,
      manualReviewEscalatedAt: null,
    });
    return true;
  }

  private async notifyPlatformFinance(payload: NotifyPayload): Promise<void> {
    for (const role of PLATFORM_FINANCE_ROLES) {
      await this.notificationClient.notifyRequired({
        ...payload,
        eventId: payload.eventId ? `${payload.eventId}:${role}` : undefined,
        target: { type: 'ROLE', role },
      });
    }
  }

  private resolveState(refund: Refund, now: Date): ManualReviewSlaState {
    if (!refund.manualReviewDueAt) return 'UNSCHEDULED';
    if (refund.manualReviewEscalatedAt) return 'ESCALATED';
    if (refund.manualReviewDueAt <= now) return 'OVERDUE';
    if (refund.manualReviewReminderAt && refund.manualReviewReminderAt <= now) {
      return 'DUE_SOON';
    }
    return 'IN_SLA';
  }

  private toAlertData(
    refund: Refund,
    payment: Payment,
  ): Record<string, unknown> {
    return {
      refundId: refund.id,
      paymentId: refund.paymentId,
      orderId: payment.orderId,
      consumerApplication: payment.callerApplication,
      provider: refund.provider,
      amount: refund.amount,
      currency: refund.currency,
      manualReviewReason: refund.manualReviewReason,
      manualReviewPolicyVersion: refund.manualReviewPolicyVersion,
      manualReviewDueAt: refund.manualReviewDueAt?.toISOString() ?? null,
      manualReviewEscalateAt:
        refund.manualReviewEscalateAt?.toISOString() ?? null,
    };
  }
}

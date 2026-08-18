import { createHash } from 'crypto';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import {
  DataSource,
  EntityManager,
  QueryFailedError,
  Repository,
} from 'typeorm';
import { Payment } from '../payment/entities/payment.entity';
import { PaymentStatus } from '../payment/enums/payment-status.enum';
import { Refund } from '../refund/entities/refund.entity';
import { RefundStatus } from '../refund/enums/refund-status.enum';
import { ListFinancialLedgerQueryDto } from './dto/list-financial-ledger-query.dto';
import { RecordFinancialSettlementDto } from './dto/record-financial-settlement.dto';
import {
  PaymentFinancialAllocationLineDto,
  RegisterPaymentFinancialAllocationDto,
} from './dto/register-payment-financial-allocation.dto';
import { FinancialLedgerEntry } from './entities/financial-ledger-entry.entity';
import { PaymentFinancialAllocation } from './entities/payment-financial-allocation.entity';
import {
  FinancialBeneficiaryType,
  FinancialLedgerComponent,
  PaymentAllocationComponent,
} from './financial-ledger.enums';

interface LedgerEntryInput {
  entryKey: string;
  component: FinancialLedgerComponent;
  paymentId: string | null;
  refundId: string | null;
  sourceApplication: string;
  sourceEventId: string;
  beneficiaryType: FinancialBeneficiaryType;
  beneficiaryId: string | null;
  amount: string;
  currency: string;
  occurredAt: Date;
  metadata: Record<string, unknown> | null;
}

export interface FinancialLedgerSummary {
  currency: string;
  gross: string;
  providerFee: string;
  providerFeeRecorded: boolean;
  platformFee: string;
  clubNet: string;
  sellerNet: string;
  refund: string;
  settlement: string;
  entryCount: number;
}

@Injectable()
export class FinancialLedgerService {
  constructor(
    @InjectRepository(FinancialLedgerEntry)
    private readonly ledgerRepository: Repository<FinancialLedgerEntry>,
    @InjectRepository(PaymentFinancialAllocation)
    private readonly allocationRepository: Repository<PaymentFinancialAllocation>,
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    @InjectRepository(Refund)
    private readonly refundRepository: Repository<Refund>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async registerPaymentAllocation(
    paymentId: string,
    dto: RegisterPaymentFinancialAllocationDto,
    sourceApplication: string,
  ): Promise<PaymentFinancialAllocation[]> {
    return this.dataSource.transaction(async (manager) => {
      const payment = await manager.getRepository(Payment).findOne({
        where: { id: paymentId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!payment || payment.callerApplication !== sourceApplication) {
        throw new NotFoundException('Payment not found');
      }

      const normalized = this.normalizeAllocation(payment.amount, dto.entries);
      const allocationRepo = manager.getRepository(PaymentFinancialAllocation);
      const existing = await allocationRepo.find({
        where: { paymentId },
        order: { component: 'ASC', reference: 'ASC' },
      });

      if (existing.length > 0) {
        if (this.allocationsMatch(existing, normalized, sourceApplication)) {
          return existing;
        }
        throw new ConflictException(
          'A different financial allocation is already registered for this payment.',
        );
      }

      if (
        payment.status !== PaymentStatus.PENDING &&
        payment.status !== PaymentStatus.PAID
      ) {
        throw new ConflictException(
          'Financial allocation can only be registered for a pending or paid payment.',
        );
      }

      const entities = normalized.map((line) =>
        allocationRepo.create({
          paymentId,
          component: line.component,
          beneficiaryType: this.allocationBeneficiaryType(line.component),
          beneficiaryId: line.beneficiaryId,
          amount: line.amount,
          reference: line.reference,
          sourceApplication,
        }),
      );
      const saved = await allocationRepo.save(entities);

      // A provider callback can race between provider init and Marketplace's
      // allocation POST. If the payment is already PAID, project the split
      // immediately. The normal PAYMENT_PAID outbox projection uses the same
      // deterministic keys, so either ordering remains exactly-once.
      if (payment.status === PaymentStatus.PAID) {
        const occurredAt = payment.paidAt ?? payment.updatedAt ?? new Date();
        for (const allocation of saved) {
          await this.postAllocationEntry(
            manager,
            payment,
            allocation,
            occurredAt,
          );
        }
      }

      return saved;
    });
  }

  async postPaymentPaid(payload: { paymentId: string }): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const payment = await manager.getRepository(Payment).findOne({
        where: { id: payload.paymentId },
      });
      if (!payment || payment.status !== PaymentStatus.PAID) {
        throw new ConflictException(
          `Cannot ledger payment ${payload.paymentId}: payment is not PAID.`,
        );
      }

      const sourceApplication = payment.callerApplication ?? 'legacy';
      const occurredAt = payment.paidAt ?? payment.updatedAt ?? new Date();
      await this.insertIdempotent(manager, {
        entryKey: this.key('PAYMENT_PAID', payment.id, 'GROSS'),
        component: FinancialLedgerComponent.GROSS,
        paymentId: payment.id,
        refundId: null,
        sourceApplication,
        sourceEventId: payment.id,
        beneficiaryType: FinancialBeneficiaryType.UNALLOCATED,
        beneficiaryId: null,
        amount: this.normalizeStoredAmount(payment.amount),
        currency: payment.currency,
        occurredAt,
        metadata: {
          orderId: payment.orderId,
          provider: payment.provider,
          providerRef: payment.providerRef,
        },
      });

      if (payment.providerFee !== null && Number(payment.providerFee) > 0) {
        await this.insertIdempotent(manager, {
          entryKey: this.key('PAYMENT_PAID', payment.id, 'PROVIDER_FEE'),
          component: FinancialLedgerComponent.PROVIDER_FEE,
          paymentId: payment.id,
          refundId: null,
          sourceApplication,
          sourceEventId: payment.id,
          beneficiaryType: FinancialBeneficiaryType.PROVIDER,
          beneficiaryId: payment.provider,
          amount: this.normalizeStoredAmount(payment.providerFee),
          currency: payment.currency,
          occurredAt,
          metadata: {
            provider: payment.provider,
            receivedAmount: payment.receivedAmount,
          },
        });
      }

      const allocations = await manager
        .getRepository(PaymentFinancialAllocation)
        .find({ where: { paymentId: payment.id }, order: { id: 'ASC' } });
      for (const allocation of allocations) {
        await this.postAllocationEntry(
          manager,
          payment,
          allocation,
          occurredAt,
        );
      }
    });
  }

  async postRefundSucceeded(payload: {
    refundId: string;
    paymentId: string;
  }): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const refund = await manager
        .getRepository(Refund)
        .findOne({ where: { id: payload.refundId } });
      if (!refund || refund.status !== RefundStatus.SUCCEEDED) {
        throw new ConflictException(
          `Cannot ledger refund ${payload.refundId}: refund is not SUCCEEDED.`,
        );
      }
      const payment = await manager
        .getRepository(Payment)
        .findOne({ where: { id: payload.paymentId } });
      if (!payment) throw new NotFoundException('Payment not found');

      await this.insertIdempotent(manager, {
        entryKey: this.key('REFUND_SUCCEEDED', refund.id),
        component: FinancialLedgerComponent.REFUND,
        paymentId: payment.id,
        refundId: refund.id,
        sourceApplication:
          payment.callerApplication ??
          refund.initiatedByApplication ??
          'legacy',
        sourceEventId: refund.id,
        beneficiaryType: payment.userId
          ? FinancialBeneficiaryType.CUSTOMER
          : FinancialBeneficiaryType.UNALLOCATED,
        beneficiaryId: payment.userId,
        amount: this.normalizeStoredAmount(refund.amount),
        currency: refund.currency,
        occurredAt: refund.succeededAt ?? refund.updatedAt ?? new Date(),
        metadata: {
          orderId: payment.orderId,
          provider: refund.provider,
          reason: refund.reason,
        },
      });
    });
  }

  async recordSettlement(
    dto: RecordFinancialSettlementDto,
    sourceApplication: string,
  ): Promise<FinancialLedgerEntry> {
    const settlementId = dto.settlementId.trim();
    if (!settlementId) {
      throw new BadRequestException('Settlement id is required.');
    }
    const beneficiaryId = dto.beneficiaryId?.trim() || null;
    this.assertSettlementBeneficiary(dto.beneficiaryType, beneficiaryId);
    const entryKey = this.key('SETTLEMENT', sourceApplication, settlementId);
    const expected: LedgerEntryInput = {
      entryKey,
      component: FinancialLedgerComponent.SETTLEMENT,
      paymentId: null,
      refundId: null,
      sourceApplication,
      sourceEventId: settlementId,
      beneficiaryType: dto.beneficiaryType,
      beneficiaryId,
      amount: this.amountFromNumber(dto.amount),
      currency: dto.currency ?? 'TND',
      occurredAt: dto.occurredAt ? new Date(dto.occurredAt) : new Date(),
      metadata: dto.reference ? { reference: dto.reference.trim() } : null,
    };

    return this.dataSource.transaction(async (manager) => {
      const existing = await manager
        .getRepository(FinancialLedgerEntry)
        .findOne({ where: { entryKey } });
      if (existing) {
        this.assertSettlementMatches(existing, expected);
        return existing;
      }
      const inserted = await this.insertIdempotent(manager, expected);
      this.assertSettlementMatches(inserted, expected);
      return inserted;
    });
  }

  async getPaymentLedgerForApplication(
    paymentId: string,
    sourceApplication: string,
  ): Promise<{
    entries: FinancialLedgerEntry[];
    summary: FinancialLedgerSummary[];
  }> {
    const payment = await this.paymentRepository.findOne({
      where: { id: paymentId },
    });
    if (!payment || payment.callerApplication !== sourceApplication) {
      throw new NotFoundException('Payment not found');
    }
    const entries = await this.ledgerRepository.find({
      where: { paymentId },
      order: { occurredAt: 'ASC', createdAt: 'ASC' },
    });
    return {
      entries,
      summary: await this.getSummaries({ paymentId }),
    };
  }

  async listOperatorEntries(
    query: ListFinancialLedgerQueryDto,
  ): Promise<FinancialLedgerEntry[]> {
    const qb = this.ledgerRepository
      .createQueryBuilder('entry')
      .orderBy('entry.occurredAt', 'DESC')
      .addOrderBy('entry.createdAt', 'DESC')
      .take(query.limit ?? 200);
    if (query.component) {
      qb.andWhere('entry.component = :component', {
        component: query.component,
      });
    }
    if (query.paymentId) {
      qb.andWhere('entry.paymentId = :paymentId', {
        paymentId: query.paymentId,
      });
    }
    if (query.refundId) {
      qb.andWhere('entry.refundId = :refundId', { refundId: query.refundId });
    }
    if (query.sourceApplication) {
      qb.andWhere('entry.sourceApplication = :sourceApplication', {
        sourceApplication: query.sourceApplication,
      });
    }
    return qb.getMany();
  }

  async getOperatorSummaries(
    query: ListFinancialLedgerQueryDto,
  ): Promise<FinancialLedgerSummary[]> {
    return this.getSummaries({
      component: query.component,
      paymentId: query.paymentId,
      refundId: query.refundId,
      sourceApplication: query.sourceApplication,
    });
  }

  private async getSummaries(filters: {
    component?: FinancialLedgerComponent;
    paymentId?: string;
    refundId?: string;
    sourceApplication?: string;
  }): Promise<FinancialLedgerSummary[]> {
    const qb = this.ledgerRepository
      .createQueryBuilder('entry')
      .select('entry.currency', 'currency')
      .addSelect('entry.component', 'component')
      .addSelect('SUM(entry.amount)', 'total')
      .addSelect('COUNT(*)', 'entryCount')
      .groupBy('entry.currency')
      .addGroupBy('entry.component');
    if (filters.component) {
      qb.andWhere('entry.component = :component', {
        component: filters.component,
      });
    }
    if (filters.paymentId) {
      qb.andWhere('entry.paymentId = :paymentId', {
        paymentId: filters.paymentId,
      });
    }
    if (filters.refundId) {
      qb.andWhere('entry.refundId = :refundId', {
        refundId: filters.refundId,
      });
    }
    if (filters.sourceApplication) {
      qb.andWhere('entry.sourceApplication = :sourceApplication', {
        sourceApplication: filters.sourceApplication,
      });
    }

    const rows = await qb.getRawMany<{
      currency: string;
      component: FinancialLedgerComponent;
      total: string;
      entryCount: string;
    }>();
    const summaries = new Map<string, FinancialLedgerSummary>();
    for (const row of rows) {
      const summary =
        summaries.get(row.currency) ?? this.emptySummary(row.currency);
      const total = this.normalizeStoredAmount(row.total);
      switch (row.component) {
        case FinancialLedgerComponent.GROSS:
          summary.gross = total;
          break;
        case FinancialLedgerComponent.PROVIDER_FEE:
          summary.providerFee = total;
          summary.providerFeeRecorded = true;
          break;
        case FinancialLedgerComponent.PLATFORM_FEE:
          summary.platformFee = total;
          break;
        case FinancialLedgerComponent.CLUB_NET:
          summary.clubNet = total;
          break;
        case FinancialLedgerComponent.SELLER_NET:
          summary.sellerNet = total;
          break;
        case FinancialLedgerComponent.REFUND:
          summary.refund = total;
          break;
        case FinancialLedgerComponent.SETTLEMENT:
          summary.settlement = total;
          break;
      }
      summary.entryCount += Number(row.entryCount);
      summaries.set(row.currency, summary);
    }
    return [...summaries.values()];
  }

  private normalizeAllocation(
    paymentAmount: string,
    entries: PaymentFinancialAllocationLineDto[],
  ): Array<{
    component: PaymentAllocationComponent;
    beneficiaryId: string | null;
    amount: string;
    reference: string;
  }> {
    const seen = new Set<string>();
    let allocatedMinor = 0;
    const normalized = entries.map((line) => {
      const reference = line.reference.trim();
      if (!reference) {
        throw new BadRequestException('Allocation reference is required.');
      }
      const duplicateKey = `${line.component}:${reference}`;
      if (seen.has(duplicateKey)) {
        throw new BadRequestException(
          `Duplicate financial allocation reference: ${duplicateKey}`,
        );
      }
      seen.add(duplicateKey);

      const beneficiaryId = line.beneficiaryId?.trim() || null;
      if (line.component === PaymentAllocationComponent.PLATFORM_FEE) {
        if (beneficiaryId) {
          throw new BadRequestException(
            'PLATFORM_FEE must not declare a beneficiaryId.',
          );
        }
      } else if (!beneficiaryId) {
        throw new BadRequestException(
          `${line.component} requires a beneficiaryId.`,
        );
      }

      const minor = this.minorFromNumber(line.amount);
      allocatedMinor += minor;
      return {
        component: line.component,
        beneficiaryId,
        amount: this.amountFromMinor(minor),
        reference,
      };
    });
    const grossMinor = this.minorFromStored(paymentAmount);
    if (allocatedMinor !== grossMinor) {
      throw new BadRequestException(
        `Financial allocation must equal payment gross amount (${this.amountFromMinor(grossMinor)}).`,
      );
    }
    return normalized;
  }

  private allocationsMatch(
    existing: PaymentFinancialAllocation[],
    normalized: Array<{
      component: PaymentAllocationComponent;
      beneficiaryId: string | null;
      amount: string;
      reference: string;
    }>,
    sourceApplication: string,
  ): boolean {
    if (existing.length !== normalized.length) return false;
    const expected = new Map(
      normalized.map((line) => [`${line.component}:${line.reference}`, line]),
    );
    return existing.every((row) => {
      const line = expected.get(`${row.component}:${row.reference}`);
      return (
        !!line &&
        row.sourceApplication === sourceApplication &&
        row.beneficiaryId === line.beneficiaryId &&
        this.normalizeStoredAmount(row.amount) === line.amount
      );
    });
  }

  private allocationBeneficiaryType(
    component: PaymentAllocationComponent,
  ): FinancialBeneficiaryType {
    switch (component) {
      case PaymentAllocationComponent.PLATFORM_FEE:
        return FinancialBeneficiaryType.PLATFORM;
      case PaymentAllocationComponent.CLUB_NET:
        return FinancialBeneficiaryType.CLUB;
      case PaymentAllocationComponent.SELLER_NET:
        return FinancialBeneficiaryType.SELLER;
    }
  }

  private allocationLedgerComponent(
    component: PaymentAllocationComponent,
  ): FinancialLedgerComponent {
    switch (component) {
      case PaymentAllocationComponent.PLATFORM_FEE:
        return FinancialLedgerComponent.PLATFORM_FEE;
      case PaymentAllocationComponent.CLUB_NET:
        return FinancialLedgerComponent.CLUB_NET;
      case PaymentAllocationComponent.SELLER_NET:
        return FinancialLedgerComponent.SELLER_NET;
    }
  }

  private async postAllocationEntry(
    manager: EntityManager,
    payment: Payment,
    allocation: PaymentFinancialAllocation,
    occurredAt: Date,
  ): Promise<void> {
    await this.insertIdempotent(manager, {
      entryKey: this.key('PAYMENT_ALLOCATION', allocation.id),
      component: this.allocationLedgerComponent(allocation.component),
      paymentId: payment.id,
      refundId: null,
      sourceApplication: allocation.sourceApplication,
      sourceEventId: allocation.reference,
      beneficiaryType: allocation.beneficiaryType,
      beneficiaryId: allocation.beneficiaryId,
      amount: this.normalizeStoredAmount(allocation.amount),
      currency: payment.currency,
      occurredAt,
      metadata: {
        allocationId: allocation.id,
        orderId: payment.orderId,
        reference: allocation.reference,
      },
    });
  }

  private assertSettlementBeneficiary(
    type: FinancialBeneficiaryType,
    beneficiaryId: string | null,
  ): void {
    if (
      type !== FinancialBeneficiaryType.PLATFORM &&
      type !== FinancialBeneficiaryType.CLUB &&
      type !== FinancialBeneficiaryType.SELLER
    ) {
      throw new BadRequestException(
        'Settlement beneficiary must be PLATFORM, CLUB or SELLER.',
      );
    }
    if (type === FinancialBeneficiaryType.PLATFORM && beneficiaryId) {
      throw new BadRequestException(
        'PLATFORM settlement must not declare a beneficiaryId.',
      );
    }
    if (
      (type === FinancialBeneficiaryType.CLUB ||
        type === FinancialBeneficiaryType.SELLER) &&
      !beneficiaryId
    ) {
      throw new BadRequestException(
        `${type} settlement requires a beneficiaryId.`,
      );
    }
  }

  private assertSettlementMatches(
    actual: FinancialLedgerEntry,
    expected: LedgerEntryInput,
  ): void {
    if (
      actual.component !== expected.component ||
      actual.sourceApplication !== expected.sourceApplication ||
      actual.sourceEventId !== expected.sourceEventId ||
      actual.beneficiaryType !== expected.beneficiaryType ||
      actual.beneficiaryId !== expected.beneficiaryId ||
      this.normalizeStoredAmount(actual.amount) !== expected.amount ||
      actual.currency !== expected.currency
    ) {
      throw new ConflictException(
        'Settlement idempotency key already exists with different financial data.',
      );
    }
  }

  private async insertIdempotent(
    manager: EntityManager,
    input: LedgerEntryInput,
  ): Promise<FinancialLedgerEntry> {
    const repo = manager.getRepository(FinancialLedgerEntry);
    const existing = await repo.findOne({
      where: { entryKey: input.entryKey },
    });
    if (existing) return existing;
    try {
      return await repo.save(repo.create(input));
    } catch (error) {
      if (
        error instanceof QueryFailedError &&
        (error as unknown as { code?: string }).code === 'ER_DUP_ENTRY'
      ) {
        const raced = await repo.findOne({
          where: { entryKey: input.entryKey },
        });
        if (raced) return raced;
      }
      throw error;
    }
  }

  private key(...parts: string[]): string {
    return createHash('sha256').update(parts.join('|')).digest('hex');
  }

  private minorFromNumber(value: number): number {
    if (!Number.isFinite(value) || value <= 0) {
      throw new BadRequestException('Financial amount must be positive.');
    }
    return Math.round(value * 1000);
  }

  private minorFromStored(value: string): number {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      throw new BadRequestException('Stored financial amount is invalid.');
    }
    return Math.round(parsed * 1000);
  }

  private amountFromNumber(value: number): string {
    return this.amountFromMinor(this.minorFromNumber(value));
  }

  private amountFromMinor(minor: number): string {
    return (minor / 1000).toFixed(3);
  }

  private normalizeStoredAmount(value: string): string {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 0) {
      throw new BadRequestException('Stored financial amount is invalid.');
    }
    return parsed.toFixed(3);
  }

  private emptySummary(currency: string): FinancialLedgerSummary {
    return {
      currency,
      gross: '0.000',
      providerFee: '0.000',
      providerFeeRecorded: false,
      platformFee: '0.000',
      clubNet: '0.000',
      sellerNet: '0.000',
      refund: '0.000',
      settlement: '0.000',
      entryCount: 0,
    };
  }
}

import { BadRequestException, ConflictException } from '@nestjs/common';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { Payment } from '../payment/entities/payment.entity';
import { PaymentProviderName } from '../payment/enums/payment-provider.enum';
import { PaymentStatus } from '../payment/enums/payment-status.enum';
import { Refund } from '../refund/entities/refund.entity';
import { FinancialLedgerEntry } from './entities/financial-ledger-entry.entity';
import { PaymentFinancialAllocation } from './entities/payment-financial-allocation.entity';
import {
  FinancialBeneficiaryType,
  FinancialLedgerComponent,
  PaymentAllocationComponent,
} from './financial-ledger.enums';
import { FinancialLedgerService } from './financial-ledger.service';

describe('FinancialLedgerService', () => {
  const payment = {
    id: '11111111-1111-4111-8111-111111111111',
    orderId: 'MO-001',
    callerApplication: 'marketplace',
    provider: PaymentProviderName.PAYMEE,
    providerRef: 'paymee-1',
    amount: '100.000',
    currency: 'TND',
    status: PaymentStatus.PENDING,
    providerFee: null,
    receivedAmount: null,
    paidAt: null,
    createdAt: new Date('2026-08-18T00:00:00Z'),
    updatedAt: new Date('2026-08-18T00:00:00Z'),
    userId: 'user-1',
  } as Payment;

  function createHarness() {
    const ledgerRepo = {
      findOne: jest.fn(),
      create: jest.fn((value) => value as FinancialLedgerEntry),
      save: jest.fn((value) => Promise.resolve(value as FinancialLedgerEntry)),
      find: jest.fn(),
      createQueryBuilder: jest.fn(),
    };
    const allocationRepo = {
      find: jest.fn(),
      create: jest.fn((value) => value as PaymentFinancialAllocation),
      save: jest.fn((value) =>
        Promise.resolve(value as PaymentFinancialAllocation[]),
      ),
    };
    const paymentRepo = { findOne: jest.fn() };
    const refundRepo = { findOne: jest.fn() };
    const manager = {
      getRepository: jest.fn((entity: unknown) => {
        if (entity === FinancialLedgerEntry) return ledgerRepo;
        if (entity === PaymentFinancialAllocation) return allocationRepo;
        if (entity === Payment) return paymentRepo;
        if (entity === Refund) return refundRepo;
        throw new Error('Unexpected repository');
      }),
    } as unknown as EntityManager;
    const dataSource = {
      transaction: jest.fn(
        async (callback: (manager: EntityManager) => Promise<unknown>) =>
          callback(manager),
      ),
    };
    const service = new FinancialLedgerService(
      ledgerRepo as unknown as Repository<FinancialLedgerEntry>,
      allocationRepo as unknown as Repository<PaymentFinancialAllocation>,
      paymentRepo as unknown as Repository<Payment>,
      refundRepo as unknown as Repository<Refund>,
      dataSource as unknown as DataSource,
    );
    return {
      service,
      ledgerRepo,
      allocationRepo,
      paymentRepo,
      refundRepo,
    };
  }

  const allocationDto = {
    entries: [
      {
        component: PaymentAllocationComponent.SELLER_NET,
        amount: 90,
        beneficiaryId: 'seller-1',
        reference: 'so-1:seller-net',
      },
      {
        component: PaymentAllocationComponent.CLUB_NET,
        amount: 10,
        beneficiaryId: 'club-1',
        reference: 'so-1:club-net',
      },
    ],
  };

  it('persists an exact immutable club/seller split before payment confirmation', async () => {
    const { service, allocationRepo, paymentRepo } = createHarness();
    paymentRepo.findOne.mockResolvedValue(payment);
    allocationRepo.find.mockResolvedValue([]);

    const result = await service.registerPaymentAllocation(
      payment.id,
      allocationDto,
      'marketplace',
    );

    expect(result).toHaveLength(2);
    expect(allocationRepo.save).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          component: PaymentAllocationComponent.SELLER_NET,
          beneficiaryType: FinancialBeneficiaryType.SELLER,
          amount: '90.000',
        }),
        expect.objectContaining({
          component: PaymentAllocationComponent.CLUB_NET,
          beneficiaryType: FinancialBeneficiaryType.CLUB,
          amount: '10.000',
        }),
      ]),
    );
  });

  it('projects a first allocation immediately when provider confirmation wins the race', async () => {
    const { service, ledgerRepo, allocationRepo, paymentRepo } =
      createHarness();
    paymentRepo.findOne.mockResolvedValue({
      ...payment,
      status: PaymentStatus.PAID,
      paidAt: new Date('2026-08-18T01:00:00Z'),
    });
    allocationRepo.find.mockResolvedValue([]);
    ledgerRepo.findOne.mockResolvedValue(null);

    await service.registerPaymentAllocation(
      payment.id,
      allocationDto,
      'marketplace',
    );

    expect(ledgerRepo.save).toHaveBeenCalledTimes(2);
    expect(
      ledgerRepo.save.mock.calls.map(
        ([entry]) => (entry as FinancialLedgerEntry).component,
      ),
    ).toEqual([
      FinancialLedgerComponent.SELLER_NET,
      FinancialLedgerComponent.CLUB_NET,
    ]);
  });

  it('rejects an allocation that does not conserve the payment gross', async () => {
    const { service, allocationRepo, paymentRepo } = createHarness();
    paymentRepo.findOne.mockResolvedValue(payment);
    allocationRepo.find.mockResolvedValue([]);

    await expect(
      service.registerPaymentAllocation(
        payment.id,
        {
          entries: [
            {
              component: PaymentAllocationComponent.SELLER_NET,
              amount: 99,
              beneficiaryId: 'seller-1',
              reference: 'so-1:seller-net',
            },
          ],
        },
        'marketplace',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('projects gross, actual provider fee and registered allocations on PAID', async () => {
    const { service, ledgerRepo, allocationRepo, paymentRepo } =
      createHarness();
    paymentRepo.findOne.mockResolvedValue({
      ...payment,
      status: PaymentStatus.PAID,
      providerFee: '2.500',
      receivedAmount: '97.500',
      paidAt: new Date('2026-08-18T01:00:00Z'),
    });
    allocationRepo.find.mockResolvedValue([
      {
        id: 'allocation-seller',
        paymentId: payment.id,
        component: PaymentAllocationComponent.SELLER_NET,
        beneficiaryType: FinancialBeneficiaryType.SELLER,
        beneficiaryId: 'seller-1',
        amount: '90.000',
        reference: 'so-1:seller-net',
        sourceApplication: 'marketplace',
      } as PaymentFinancialAllocation,
      {
        id: 'allocation-club',
        paymentId: payment.id,
        component: PaymentAllocationComponent.CLUB_NET,
        beneficiaryType: FinancialBeneficiaryType.CLUB,
        beneficiaryId: 'club-1',
        amount: '10.000',
        reference: 'so-1:club-net',
        sourceApplication: 'marketplace',
      } as PaymentFinancialAllocation,
    ]);
    ledgerRepo.findOne.mockResolvedValue(null);

    await service.postPaymentPaid({ paymentId: payment.id });

    const components = ledgerRepo.save.mock.calls.map(
      ([entry]) => (entry as FinancialLedgerEntry).component,
    );
    expect(components).toEqual([
      FinancialLedgerComponent.GROSS,
      FinancialLedgerComponent.PROVIDER_FEE,
      FinancialLedgerComponent.SELLER_NET,
      FinancialLedgerComponent.CLUB_NET,
    ]);
  });

  it('treats a settlement replay as idempotent but rejects changed financial data', async () => {
    const { service, ledgerRepo } = createHarness();
    const existing = {
      entryKey: 'existing-key',
      component: FinancialLedgerComponent.SETTLEMENT,
      paymentId: null,
      refundId: null,
      sourceApplication: 'marketplace',
      sourceEventId: 'payout-1',
      beneficiaryType: FinancialBeneficiaryType.SELLER,
      beneficiaryId: 'seller-1',
      amount: '50.000',
      currency: 'TND',
      occurredAt: new Date('2026-08-18T01:00:00Z'),
      metadata: null,
    } as FinancialLedgerEntry;
    ledgerRepo.findOne.mockResolvedValue(existing);

    await expect(
      service.recordSettlement(
        {
          settlementId: 'payout-1',
          amount: 50,
          beneficiaryType: FinancialBeneficiaryType.SELLER,
          beneficiaryId: 'seller-1',
        },
        'marketplace',
      ),
    ).resolves.toBe(existing);

    await expect(
      service.recordSettlement(
        {
          settlementId: 'payout-1',
          amount: 49,
          beneficiaryType: FinancialBeneficiaryType.SELLER,
          beneficiaryId: 'seller-1',
        },
        'marketplace',
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects a blank settlement id even when the service is called directly', async () => {
    const { service } = createHarness();

    await expect(
      service.recordSettlement(
        {
          settlementId: '   ',
          amount: 50,
          beneficiaryType: FinancialBeneficiaryType.SELLER,
          beneficiaryId: 'seller-1',
        },
        'marketplace',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

import { MigrationInterface, QueryRunner } from 'typeorm';

/** PAY-004 — append-only financial ledger and immutable payment allocations. */
export class AddFinancialLedger1787020000000 implements MigrationInterface {
  name = 'AddFinancialLedger1787020000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS payment_financial_allocations (
        id varchar(36) NOT NULL,
        paymentId varchar(36) NOT NULL,
        component enum('PLATFORM_FEE','CLUB_NET','SELLER_NET') NOT NULL,
        beneficiaryType enum('UNALLOCATED','PROVIDER','PLATFORM','CLUB','SELLER','CUSTOMER') NOT NULL,
        beneficiaryId varchar(191) NULL,
        amount decimal(12,3) NOT NULL,
        reference varchar(191) NOT NULL,
        sourceApplication varchar(100) NOT NULL,
        createdAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        PRIMARY KEY (id),
        UNIQUE KEY uq_payment_financial_allocation (paymentId, component, reference),
        KEY idx_payment_financial_allocations_payment (paymentId)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS financial_ledger_entries (
        id varchar(36) NOT NULL,
        entryKey char(64) NOT NULL,
        component enum('GROSS','PROVIDER_FEE','PLATFORM_FEE','CLUB_NET','SELLER_NET','REFUND','SETTLEMENT') NOT NULL,
        paymentId varchar(36) NULL,
        refundId varchar(36) NULL,
        sourceApplication varchar(100) NOT NULL,
        sourceEventId varchar(191) NOT NULL,
        beneficiaryType enum('UNALLOCATED','PROVIDER','PLATFORM','CLUB','SELLER','CUSTOMER') NOT NULL,
        beneficiaryId varchar(191) NULL,
        amount decimal(12,3) NOT NULL,
        currency varchar(3) NOT NULL DEFAULT 'TND',
        occurredAt datetime NOT NULL,
        metadata json NULL,
        createdAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        PRIMARY KEY (id),
        UNIQUE KEY uq_financial_ledger_entry_key (entryKey),
        KEY idx_financial_ledger_component (component),
        KEY idx_financial_ledger_payment (paymentId),
        KEY idx_financial_ledger_refund (refundId),
        KEY idx_financial_ledger_source (sourceApplication),
        KEY idx_financial_ledger_occurred (occurredAt)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    // Backfill only facts Payments already owns. Historical club/seller
    // allocations and marketplace settlements cannot be reconstructed safely
    // from this autonomous database, so they deliberately start at PAY-004.
    await queryRunner.query(`
      INSERT IGNORE INTO financial_ledger_entries (
        id, entryKey, component, paymentId, refundId, sourceApplication,
        sourceEventId, beneficiaryType, beneficiaryId, amount, currency,
        occurredAt, metadata
      )
      SELECT
        UUID(), SHA2(CONCAT('PAYMENT_PAID|', p.id, '|GROSS'), 256), 'GROSS',
        p.id, NULL, COALESCE(p.callerApplication, 'legacy'), p.id,
        'UNALLOCATED', NULL, p.amount, p.currency,
        COALESCE(p.paidAt, p.updatedAt, p.createdAt), NULL
      FROM payments p
      WHERE p.status = 'PAID'
    `);

    await queryRunner.query(`
      INSERT IGNORE INTO financial_ledger_entries (
        id, entryKey, component, paymentId, refundId, sourceApplication,
        sourceEventId, beneficiaryType, beneficiaryId, amount, currency,
        occurredAt, metadata
      )
      SELECT
        UUID(), SHA2(CONCAT('PAYMENT_PAID|', p.id, '|PROVIDER_FEE'), 256),
        'PROVIDER_FEE', p.id, NULL, COALESCE(p.callerApplication, 'legacy'),
        p.id, 'PROVIDER', p.provider, p.providerFee, p.currency,
        COALESCE(p.paidAt, p.updatedAt, p.createdAt), NULL
      FROM payments p
      WHERE p.status = 'PAID'
        AND p.providerFee IS NOT NULL
        AND p.providerFee > 0
    `);

    await queryRunner.query(`
      INSERT IGNORE INTO financial_ledger_entries (
        id, entryKey, component, paymentId, refundId, sourceApplication,
        sourceEventId, beneficiaryType, beneficiaryId, amount, currency,
        occurredAt, metadata
      )
      SELECT
        UUID(), SHA2(CONCAT('REFUND_SUCCEEDED|', r.id), 256), 'REFUND',
        r.paymentId, r.id,
        COALESCE(p.callerApplication, r.initiatedByApplication, 'legacy'), r.id,
        CASE WHEN p.userId IS NULL THEN 'UNALLOCATED' ELSE 'CUSTOMER' END,
        p.userId, r.amount, r.currency,
        COALESCE(r.succeededAt, r.updatedAt, r.createdAt), NULL
      FROM refunds r
      LEFT JOIN payments p ON p.id = r.paymentId
      WHERE r.status = 'SUCCEEDED'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS financial_ledger_entries');
    await queryRunner.query(
      'DROP TABLE IF EXISTS payment_financial_allocations',
    );
  }
}

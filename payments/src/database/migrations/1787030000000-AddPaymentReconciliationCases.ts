import { MigrationInterface, QueryRunner } from 'typeorm';

/** PAY-005 — durable provider/internal discrepancy queue with append-only audit. */
export class AddPaymentReconciliationCases1787030000000
  implements MigrationInterface
{
  name = 'AddPaymentReconciliationCases1787030000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS payment_reconciliation_cases (
        id varchar(36) NOT NULL,
        paymentId varchar(36) NOT NULL,
        provider enum('konnect','paymee','flouci') NOT NULL,
        consumerApplication varchar(100) NULL,
        status enum('OPEN','RESOLVED') NOT NULL DEFAULT 'OPEN',
        discrepancyType enum('STALE_PENDING','STATUS_MISMATCH','PROVIDER_CHECK_FAILED','PROVIDER_EVIDENCE_UNAVAILABLE','MISSING_PROVIDER_REFERENCE') NOT NULL,
        evidenceSource enum('LIVE_PROVIDER_API','SIGNED_WEBHOOK','NONE') NOT NULL,
        internalStatus enum('PENDING','PAID','FAILED','EXPIRED') NOT NULL,
        providerStatus varchar(64) NULL,
        mappedProviderStatus enum('PENDING','PAID','FAILED','EXPIRED') NULL,
        fingerprint char(64) NOT NULL,
        detail text NULL,
        detectedAt datetime NOT NULL,
        lastCheckedAt datetime NOT NULL,
        checkCount int NOT NULL DEFAULT 1,
        resolvedAt datetime NULL,
        resolutionAction enum('ACCEPT_INTERNAL','DOCUMENT_EXCEPTION','AUTO_MATCH') NULL,
        resolvedByApplication varchar(100) NULL,
        resolvedByUser varchar(100) NULL,
        resolutionNote text NULL,
        createdAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updatedAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (id),
        UNIQUE KEY uq_payment_reconciliation_case_payment (paymentId),
        KEY idx_payment_reconciliation_case_status (status),
        KEY idx_payment_reconciliation_case_provider (provider),
        KEY idx_payment_reconciliation_case_consumer (consumerApplication),
        KEY idx_payment_reconciliation_case_checked (lastCheckedAt)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS payment_reconciliation_events (
        id varchar(36) NOT NULL,
        caseId varchar(36) NOT NULL,
        action enum('OPENED','REOPENED','CHECKED','RECHECKED','RESOLVED','AUTO_RESOLVED') NOT NULL,
        actorApplication varchar(100) NOT NULL,
        actorUser varchar(100) NULL,
        ipAddress varchar(64) NULL,
        userAgent varchar(512) NULL,
        note text NULL,
        beforeState json NULL,
        afterState json NULL,
        createdAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        PRIMARY KEY (id),
        KEY idx_payment_reconciliation_event_case (caseId),
        KEY idx_payment_reconciliation_event_created (createdAt)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'DROP TABLE IF EXISTS payment_reconciliation_events',
    );
    await queryRunner.query(
      'DROP TABLE IF EXISTS payment_reconciliation_cases',
    );
  }
}

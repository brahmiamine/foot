import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Non-destructive baseline for databases that may already have been created
 * by TypeORM synchronize in pre-migration environments. Existing tables are
 * preserved; fresh databases receive the complete current schema.
 */
export class BaselinePaymentsSchema1786841000000 implements MigrationInterface {
  name = 'BaselinePaymentsSchema1786841000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id varchar(36) NOT NULL,
        orderId varchar(100) NOT NULL,
        userId varchar(36) NULL,
        callerApplication varchar(100) NULL,
        idempotencyKey varchar(255) NULL,
        provider enum('konnect','paymee','flouci') NOT NULL DEFAULT 'konnect',
        amount decimal(12,3) NOT NULL,
        currency varchar(3) NOT NULL DEFAULT 'TND',
        status enum('PENDING','PAID','FAILED','EXPIRED','UNKNOWN') NOT NULL DEFAULT 'PENDING',
        providerRef varchar(191) NULL,
        payUrl text NULL,
        lastProviderStatus varchar(32) NULL,
        paidAt timestamp NULL,
        receivedAmount decimal(12,3) NULL,
        providerFee decimal(12,3) NULL,
        lastWebhookAt timestamp NULL,
        webhookReceivedCount int NOT NULL DEFAULT 0,
        createdAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updatedAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (id),
        INDEX IDX_payments_orderId (orderId),
        UNIQUE INDEX IDX_payments_providerRef (providerRef),
        UNIQUE INDEX UQ_payments_caller_idempotency (callerApplication, idempotencyKey)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS refunds (
        id varchar(36) NOT NULL,
        paymentId varchar(36) NOT NULL,
        provider enum('konnect','paymee','flouci') NOT NULL,
        idempotencyKey varchar(255) NULL,
        amount decimal(12,3) NOT NULL,
        currency varchar(3) NOT NULL DEFAULT 'TND',
        status enum('REQUESTED','PROCESSING','SUCCEEDED','FAILED','MANUAL_REVIEW') NOT NULL DEFAULT 'REQUESTED',
        reason text NOT NULL,
        initiatedByApplication varchar(100) NOT NULL,
        initiatedByUser varchar(100) NULL,
        providerRefundRef varchar(191) NULL,
        lastProviderStatus varchar(64) NULL,
        failureReason text NULL,
        manualReviewReason text NULL,
        resolvedByUser varchar(100) NULL,
        resolutionNote text NULL,
        succeededAt timestamp NULL,
        createdAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updatedAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (id),
        INDEX IDX_refunds_paymentId (paymentId),
        UNIQUE INDEX UQ_refunds_payment_idempotency (paymentId, idempotencyKey)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS refund_status_history (
        id varchar(36) NOT NULL,
        refundId varchar(36) NOT NULL,
        fromStatus enum('REQUESTED','PROCESSING','SUCCEEDED','FAILED','MANUAL_REVIEW') NULL,
        toStatus enum('REQUESTED','PROCESSING','SUCCEEDED','FAILED','MANUAL_REVIEW') NOT NULL,
        reason text NULL,
        actor varchar(150) NOT NULL,
        createdAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        PRIMARY KEY (id),
        INDEX IDX_refund_history_refundId (refundId)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS payment_outbox_events (
        id varchar(36) NOT NULL,
        eventType varchar(50) NOT NULL,
        aggregateId varchar(36) NOT NULL,
        payload json NOT NULL,
        status enum('PENDING','PROCESSED','FAILED') NOT NULL DEFAULT 'PENDING',
        attempts int NOT NULL DEFAULT 0,
        nextRetryAt timestamp NULL,
        createdAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        processedAt timestamp NULL,
        lastError text NULL,
        PRIMARY KEY (id),
        INDEX IDX_payment_outbox_aggregateId (aggregateId),
        INDEX IDX_payment_outbox_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
  }

  public down(): Promise<void> {
    return Promise.reject(
      new Error(
        'BaselinePaymentsSchema cannot be reverted safely because it may have adopted pre-existing production tables.',
      ),
    );
  }
}

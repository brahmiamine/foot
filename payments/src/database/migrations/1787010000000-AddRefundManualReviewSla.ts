import { MigrationInterface, QueryRunner } from 'typeorm';

/** PAY-003 — SLA snapshots, reminders and escalations for manual refunds. */
export class AddRefundManualReviewSla1787010000000 implements MigrationInterface {
  name = 'AddRefundManualReviewSla1787010000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS refund_manual_review_policies (
        consumerApplication varchar(100) NOT NULL,
        slaMinutes int NOT NULL DEFAULT 1440,
        reminderBeforeDueMinutes int NOT NULL DEFAULT 240,
        escalationAfterDueMinutes int NOT NULL DEFAULT 60,
        version int NOT NULL DEFAULT 1,
        updatedByApplication varchar(100) NOT NULL,
        updatedByUser varchar(100) NULL,
        createdAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updatedAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (consumerApplication)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await queryRunner.query(`
      ALTER TABLE refunds
        ADD COLUMN manualReviewPolicyVersion int NULL AFTER manualReviewReason,
        ADD COLUMN manualReviewStartedAt datetime(6) NULL AFTER manualReviewPolicyVersion,
        ADD COLUMN manualReviewReminderAt datetime(6) NULL AFTER manualReviewStartedAt,
        ADD COLUMN manualReviewReminderSentAt datetime(6) NULL AFTER manualReviewReminderAt,
        ADD COLUMN manualReviewDueAt datetime(6) NULL AFTER manualReviewReminderSentAt,
        ADD COLUMN manualReviewEscalateAt datetime(6) NULL AFTER manualReviewDueAt,
        ADD COLUMN manualReviewEscalatedAt datetime(6) NULL AFTER manualReviewEscalateAt
    `);

    await queryRunner.query(`
      CREATE INDEX idx_refunds_manual_review_due
      ON refunds (status, manualReviewDueAt)
    `);
    await queryRunner.query(`
      CREATE INDEX idx_refunds_manual_review_reminder
      ON refunds (status, manualReviewReminderAt, manualReviewReminderSentAt)
    `);
    await queryRunner.query(`
      CREATE INDEX idx_refunds_manual_review_escalation
      ON refunds (status, manualReviewEscalateAt, manualReviewEscalatedAt)
    `);

    // Existing MANUAL_REVIEW rows receive the documented default SLA. The
    // runtime will reconcile the exact start against the append-only history
    // before emitting any reminder/escalation.
    await queryRunner.query(`
      UPDATE refunds r
      LEFT JOIN (
        SELECT refundId, MAX(createdAt) AS manualStartedAt
        FROM refund_status_history
        WHERE toStatus = 'MANUAL_REVIEW'
        GROUP BY refundId
      ) h ON h.refundId = r.id
      SET r.manualReviewPolicyVersion = 0,
          r.manualReviewStartedAt = COALESCE(h.manualStartedAt, r.updatedAt, r.createdAt),
          r.manualReviewReminderAt = DATE_ADD(
            COALESCE(h.manualStartedAt, r.updatedAt, r.createdAt),
            INTERVAL 1200 MINUTE
          ),
          r.manualReviewDueAt = DATE_ADD(
            COALESCE(h.manualStartedAt, r.updatedAt, r.createdAt),
            INTERVAL 1440 MINUTE
          ),
          r.manualReviewEscalateAt = DATE_ADD(
            COALESCE(h.manualStartedAt, r.updatedAt, r.createdAt),
            INTERVAL 1500 MINUTE
          )
      WHERE r.status = 'MANUAL_REVIEW'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'DROP INDEX idx_refunds_manual_review_escalation ON refunds',
    );
    await queryRunner.query(
      'DROP INDEX idx_refunds_manual_review_reminder ON refunds',
    );
    await queryRunner.query(
      'DROP INDEX idx_refunds_manual_review_due ON refunds',
    );
    await queryRunner.query(`
      ALTER TABLE refunds
        DROP COLUMN manualReviewEscalatedAt,
        DROP COLUMN manualReviewEscalateAt,
        DROP COLUMN manualReviewDueAt,
        DROP COLUMN manualReviewReminderSentAt,
        DROP COLUMN manualReviewReminderAt,
        DROP COLUMN manualReviewStartedAt,
        DROP COLUMN manualReviewPolicyVersion
    `);
    await queryRunner.query(
      'DROP TABLE IF EXISTS refund_manual_review_policies',
    );
  }
}

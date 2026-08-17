import { MigrationInterface, QueryRunner } from 'typeorm';

/** PAY-002 — approval thresholds and immutable approval snapshots on refunds. */
export class AddRefundApprovalGovernance1787000000000
  implements MigrationInterface
{
  name = 'AddRefundApprovalGovernance1787000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS refund_approval_policies (
        consumerApplication varchar(100) NOT NULL,
        autoMaxAmount decimal(12,3) NULL,
        dualApprovalMinAmount decimal(12,3) NULL,
        makerCheckerEnabled tinyint NOT NULL DEFAULT 1,
        version int NOT NULL DEFAULT 1,
        updatedByApplication varchar(100) NOT NULL,
        createdAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updatedAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (consumerApplication)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await queryRunner.query(`
      ALTER TABLE refunds
        MODIFY status enum('REQUESTED','AWAITING_APPROVAL','PROCESSING','SUCCEEDED','FAILED','MANUAL_REVIEW') NOT NULL DEFAULT 'REQUESTED',
        ADD COLUMN approvalMode enum('AUTO','SINGLE_APPROVAL','DUAL_APPROVAL') NOT NULL DEFAULT 'SINGLE_APPROVAL' AFTER initiatedByUser,
        ADD COLUMN approvalPolicyVersion int NOT NULL DEFAULT 0 AFTER approvalMode,
        ADD COLUMN approvalMakerCheckerEnabled tinyint NOT NULL DEFAULT 1 AFTER approvalPolicyVersion,
        ADD COLUMN approvalMakerPrincipal varchar(191) NULL AFTER approvalMakerCheckerEnabled,
        ADD COLUMN approval1ByUser varchar(100) NULL AFTER approvalMakerPrincipal,
        ADD COLUMN approval1At timestamp NULL AFTER approval1ByUser,
        ADD COLUMN approval2ByUser varchar(100) NULL AFTER approval1At,
        ADD COLUMN approval2At timestamp NULL AFTER approval2ByUser,
        ADD COLUMN approvedAt timestamp NULL AFTER approval2At
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      "UPDATE refunds SET status = 'FAILED', failureReason = COALESCE(failureReason, 'Refund approval migration rolled back.') WHERE status = 'AWAITING_APPROVAL'",
    );
    await queryRunner.query(`
      ALTER TABLE refunds
        DROP COLUMN approvedAt,
        DROP COLUMN approval2At,
        DROP COLUMN approval2ByUser,
        DROP COLUMN approval1At,
        DROP COLUMN approval1ByUser,
        DROP COLUMN approvalMakerPrincipal,
        DROP COLUMN approvalMakerCheckerEnabled,
        DROP COLUMN approvalPolicyVersion,
        DROP COLUMN approvalMode,
        MODIFY status enum('REQUESTED','PROCESSING','SUCCEEDED','FAILED','MANUAL_REVIEW') NOT NULL DEFAULT 'REQUESTED'
    `);
    await queryRunner.query('DROP TABLE IF EXISTS refund_approval_policies');
  }
}

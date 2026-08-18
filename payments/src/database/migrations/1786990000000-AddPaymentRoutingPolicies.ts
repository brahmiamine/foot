import { MigrationInterface, QueryRunner } from 'typeorm';

/** PAY-001 — consumer-scoped provider enabled/default/fallback routing. */
export class AddPaymentRoutingPolicies1786990000000 implements MigrationInterface {
  name = 'AddPaymentRoutingPolicies1786990000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS payment_routing_policies (
        consumerApplication varchar(100) NOT NULL,
        enabledProviders json NOT NULL,
        defaultProvider enum('konnect','paymee','flouci') NOT NULL,
        fallbackProvider enum('konnect','paymee','flouci') NULL,
        version int NOT NULL DEFAULT 1,
        updatedByApplication varchar(100) NOT NULL,
        createdAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updatedAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (consumerApplication)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS payment_routing_policies');
  }
}

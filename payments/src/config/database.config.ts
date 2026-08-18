import { registerAs } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { BaselinePaymentsSchema1786841000000 } from '../database/migrations/1786841000000-BaselinePaymentsSchema';
import { AddPaymentRoutingPolicies1786990000000 } from '../database/migrations/1786990000000-AddPaymentRoutingPolicies';
import { AddRefundApprovalGovernance1787000000000 } from '../database/migrations/1787000000000-AddRefundApprovalGovernance';
import { AddRefundManualReviewSla1787010000000 } from '../database/migrations/1787010000000-AddRefundManualReviewSla';

export const databaseConfig = registerAs(
  'database',
  (): TypeOrmModuleOptions => ({
    type: 'mysql',
    host: process.env.DB_HOST,
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 3306,
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    autoLoadEntities: true,
    synchronize: process.env.NODE_ENV !== 'production',
    migrationsTableName: 'payments_migrations',
    migrations: [
      BaselinePaymentsSchema1786841000000,
      AddPaymentRoutingPolicies1786990000000,
      AddRefundApprovalGovernance1787000000000,
      AddRefundManualReviewSla1787010000000,
    ],
    migrationsRun: process.env.DB_RUN_MIGRATIONS === 'true',
  }),
);

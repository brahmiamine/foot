import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { BaselinePaymentsSchema1786841000000 } from './migrations/1786841000000-BaselinePaymentsSchema';
import { AddPaymentRoutingPolicies1786990000000 } from './migrations/1786990000000-AddPaymentRoutingPolicies';
import { AddRefundApprovalGovernance1787000000000 } from './migrations/1787000000000-AddRefundApprovalGovernance';
import { AddRefundManualReviewSla1787010000000 } from './migrations/1787010000000-AddRefundManualReviewSla';
import { AddFinancialLedger1787020000000 } from './migrations/1787020000000-AddFinancialLedger';

export const paymentsDataSource = new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST,
  port: process.env.DB_PORT ? Number.parseInt(process.env.DB_PORT, 10) : 3306,
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  synchronize: false,
  migrationsTableName: 'payments_migrations',
  migrations: [
    BaselinePaymentsSchema1786841000000,
    AddPaymentRoutingPolicies1786990000000,
    AddRefundApprovalGovernance1787000000000,
    AddRefundManualReviewSla1787010000000,
    AddFinancialLedger1787020000000,
  ],
});

export default paymentsDataSource;

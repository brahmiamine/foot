import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { BaselinePaymentsSchema1786841000000 } from './migrations/1786841000000-BaselinePaymentsSchema';

export const paymentsDataSource = new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST,
  port: process.env.DB_PORT ? Number.parseInt(process.env.DB_PORT, 10) : 3306,
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  synchronize: false,
  migrationsTableName: 'payments_migrations',
  migrations: [BaselinePaymentsSchema1786841000000],
});

export default paymentsDataSource;

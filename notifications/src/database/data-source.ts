import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { BaselineNotificationsSchema1786841100000 } from './migrations/1786841100000-BaselineNotificationsSchema';
import { AddNotificationsGovernance1787017200000 } from './migrations/1787017200000-AddNotificationsGovernance';

export const notificationsDataSource = new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST,
  port: process.env.DB_PORT ? Number.parseInt(process.env.DB_PORT, 10) : 3306,
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  synchronize: false,
  migrationsTableName: 'notifications_migrations',
  migrations: [
    BaselineNotificationsSchema1786841100000,
    AddNotificationsGovernance1787017200000,
  ],
});

export default notificationsDataSource;

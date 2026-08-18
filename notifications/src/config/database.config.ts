import { registerAs } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { BaselineNotificationsSchema1786841100000 } from '../database/migrations/1786841100000-BaselineNotificationsSchema';
import { AddNotificationsGovernance1787017200000 } from '../database/migrations/1787017200000-AddNotificationsGovernance';

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
    migrationsTableName: 'notifications_migrations',
    migrations: [
      BaselineNotificationsSchema1786841100000,
      AddNotificationsGovernance1787017200000,
    ],
    migrationsRun: process.env.DB_RUN_MIGRATIONS === 'true',
  }),
);

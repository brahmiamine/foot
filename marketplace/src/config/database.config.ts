import { registerAs } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

/**
 * Contrairement à payments/notifications, marketplace se
 * connecte à la base partagée `foot` (DB_DATABASE=foot) : les tables
 * `sp_*` qu'elle lit/écrit sont celles créées et possédées par le schéma
 * `seller-portal` (sql/schema.sql + migrations), voir TS-04 dans
 * avancement.md — c'est le schéma cible explicite du backlog
 * (`seller-portal → HTTP → marketplace → sp_products`), pas une base
 * indépendante.
 *
 * `synchronize` reste désactivé en toute circonstance : marketplace
 * n'est jamais responsable du schéma de ces tables, seulement de leur
 * contenu. Toute évolution de colonne passe par une migration côté
 * seller-portal (sql/migration_*.sql), jamais par TypeORM ici.
 */
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
    synchronize: false,
  }),
);

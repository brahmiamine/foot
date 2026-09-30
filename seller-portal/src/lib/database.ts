// reflect-metadata doit être importé avant toute entité décorée par TypeORM.
import "reflect-metadata";

import { DataSource } from "typeorm";
import { Seller } from "@/entities/Seller";
import { SellerUser } from "@/entities/SellerUser";
import { ProductCategory } from "@/entities/ProductCategory";
import { Product } from "@/entities/Product";
import { ProductImage } from "@/entities/ProductImage";
import { ProductVariant } from "@/entities/ProductVariant";
import { InventoryItem } from "@/entities/InventoryItem";
import { MarketOrder } from "@/entities/MarketOrder";
import { SellerOrder } from "@/entities/SellerOrder";
import { SellerOrderItem } from "@/entities/SellerOrderItem";
import { ReturnRequest } from "@/entities/ReturnRequest";
import { Payout } from "@/entities/Payout";
import { Notification } from "@/entities/Notification";
import { Team } from "@/entities/Team";
import { TeamBranding } from "@/entities/TeamBranding";

/**
 * Connexion TypeORM vers la base MariaDB "foot" partagée avec les autres
 * apps du monorepo (arbinote/federation-hub/club-hub/...). Les tables de
 * cette app sont préfixées `sp_` (Seller Portal) pour rester isolées.
 *
 * Comme dans club-hub, on mémorise la promesse d'initialisation pour que
 * les rendus concurrents de Next.js (layout + page en parallèle) attendent
 * tous la même instance au lieu d'en recréer une seconde.
 */
const globalForDataSource = globalThis as unknown as {
  sellerPortalDataSource?: DataSource | null;
  sellerPortalDataSourceInit?: Promise<DataSource> | null;
};

let dataSource: DataSource | null = globalForDataSource.sellerPortalDataSource ?? null;
let initPromise: Promise<DataSource> | null = globalForDataSource.sellerPortalDataSourceInit ?? null;

const ENTITIES = [
  Seller,
  SellerUser,
  ProductCategory,
  Product,
  ProductImage,
  ProductVariant,
  InventoryItem,
  MarketOrder,
  SellerOrder,
  SellerOrderItem,
  ReturnRequest,
  Payout,
  Notification,
  Team,
  TeamBranding,
];

/**
 * Next.js (dev, `--webpack`) compile certaines routes à la demande dans des
 * chunks distincts : les classes d'entités importées par une route
 * fraîchement compilée peuvent être des objets différents de ceux utilisés
 * pour construire la DataSource mise en cache (même fichier source, identité
 * de classe différente). TypeORM résout ses métadonnées par référence de
 * classe, donc `getRepository(X)` échoue avec « No metadata for X was found »
 * alors que la DataSource est "initialized". On détecte ce cas et on
 * reconstruit une DataSource fraîche. Sans effet en production (un bundle).
 */
function isStale(ds: DataSource): boolean {
  return !ENTITIES.every((entity) => ds.hasMetadata(entity));
}

export async function getDataSource(): Promise<DataSource> {
  if (dataSource && dataSource.isInitialized) {
    if (!isStale(dataSource)) {
      return dataSource;
    }
    const stale = dataSource;
    dataSource = null;
    initPromise = null;
    globalForDataSource.sellerPortalDataSource = null;
    globalForDataSource.sellerPortalDataSourceInit = null;
    await stale.destroy().catch(() => {});
  }

  if (!initPromise) {
    const newDataSource = new DataSource({
      type: "mariadb",
      host: process.env.DB_HOST || "localhost",
      port: parseInt(process.env.DB_PORT || "3307", 10),
      username: process.env.DB_USER || "root",
      password: process.env.DB_PASSWORD || "",
      database: process.env.DB_NAME || "foot",
      synchronize: false, // Jamais en production — voir sql/schema.sql
      logging: process.env.NODE_ENV === "development",
      entities: ENTITIES,
      migrations: [],
      charset: "utf8mb4",
      timezone: "Z",
    });

    initPromise = newDataSource.initialize().then((ds) => {
      dataSource = ds;
      globalForDataSource.sellerPortalDataSource = ds;
      globalForDataSource.sellerPortalDataSourceInit = initPromise;
      return ds;
    });
  }

  return initPromise;
}

export async function closeDataSource(): Promise<void> {
  if (dataSource && dataSource.isInitialized) {
    await dataSource.destroy();
    dataSource = null;
    initPromise = null;
    globalForDataSource.sellerPortalDataSource = null;
    globalForDataSource.sellerPortalDataSourceInit = null;
  }
}

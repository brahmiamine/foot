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
 * apps du monorepo (arbinote/superadmin/teamManager/...). Les tables de
 * cette app sont préfixées `sp_` (Seller Portal) pour rester isolées.
 *
 * Comme dans teamManager, on mémorise la promesse d'initialisation pour que
 * les rendus concurrents de Next.js (layout + page en parallèle) attendent
 * tous la même instance au lieu d'en recréer une seconde.
 */
let dataSource: DataSource | null = null;
let initPromise: Promise<DataSource> | null = null;

export async function getDataSource(): Promise<DataSource> {
  if (dataSource && dataSource.isInitialized) {
    return dataSource;
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
      entities: [
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
      ],
      migrations: [],
      charset: "utf8mb4",
      timezone: "Z",
    });

    initPromise = newDataSource.initialize().then((ds) => {
      dataSource = ds;
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
  }
}

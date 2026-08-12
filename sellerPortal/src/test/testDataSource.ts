import "reflect-metadata";
import { DataSource } from "typeorm";
import { InventoryItem } from "@/entities/InventoryItem";
import { MarketOrder } from "@/entities/MarketOrder";
import { Notification } from "@/entities/Notification";
import { Payout } from "@/entities/Payout";
import { Product } from "@/entities/Product";
import { ProductCategory } from "@/entities/ProductCategory";
import { ProductImage } from "@/entities/ProductImage";
import { ProductVariant } from "@/entities/ProductVariant";
import { ReturnRequest } from "@/entities/ReturnRequest";
import { Seller } from "@/entities/Seller";
import { SellerOrder } from "@/entities/SellerOrder";
import { SellerOrderItem } from "@/entities/SellerOrderItem";
import { SellerUser } from "@/entities/SellerUser";
import { Team } from "@/entities/Team";
import { TeamBranding } from "@/entities/TeamBranding";

/**
 * DataSource SQLite en mémoire, isolée et jetable, avec les vraies entités
 * TypeORM — utilisée par les tests d'intégration pour exécuter du vrai SQL
 * sans dépendre d'un serveur MySQL. Toutes les entités sont enregistrées
 * (même celles non seedées par un test donné) : plusieurs relations sont
 * déclarées par nom de classe (ex. Seller.users -> "SellerUser"), TypeORM
 * exige leur métadonnée même sans les utiliser. Même pattern que
 * arbinote/src/test/testDataSource.ts et les autres apps du dépôt.
 */
export async function createTestDataSource(): Promise<DataSource> {
  const dataSource = new DataSource({
    type: "better-sqlite3",
    database: ":memory:",
    dropSchema: true,
    synchronize: true,
    entities: [
      InventoryItem,
      MarketOrder,
      Notification,
      Payout,
      Product,
      ProductCategory,
      ProductImage,
      ProductVariant,
      ReturnRequest,
      Seller,
      SellerOrder,
      SellerOrderItem,
      SellerUser,
      Team,
      TeamBranding,
    ],
  });

  await dataSource.initialize();
  return dataSource;
}

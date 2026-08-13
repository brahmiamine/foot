import "reflect-metadata";
import { DataSource } from "typeorm";
import { Federation } from "@/entities/Federation";
import { News } from "@/entities/News";
import { NotificationOutboxEvent } from "@/entities/NotificationOutboxEvent";
import { Product } from "@/entities/Product";
import { ProductCategory } from "@/entities/ProductCategory";
import { ProcessedWebhookEvent } from "@/entities/ProcessedWebhookEvent";
import { ShopOrder } from "@/entities/ShopOrder";
import { ShopOrderItem } from "@/entities/ShopOrderItem";
import { StockUnavailableRefund } from "@/entities/StockUnavailableRefund";
import { Team } from "@/entities/Team";

/**
 * DataSource SQLite en mémoire, isolée et jetable, avec les vraies entités
 * TypeORM — utilisée par les tests d'intégration pour exécuter du vrai SQL
 * sans dépendre d'un serveur MySQL. Même pattern que
 * billetterie/src/test/testDataSource.ts. Scope volontairement limité aux
 * entités touchées par la boutique (voir ShopOrderService.ts) et l'outbox
 * notification (voir NotificationOutboxService.ts, TS-25/TS-26).
 */
export async function createTestDataSource(): Promise<DataSource> {
  const dataSource = new DataSource({
    type: "better-sqlite3",
    database: ":memory:",
    dropSchema: true,
    synchronize: true,
    entities: [Federation, News, NotificationOutboxEvent, Product, ProductCategory, ProcessedWebhookEvent, ShopOrder, ShopOrderItem, StockUnavailableRefund, Team],
  });

  await dataSource.initialize();
  return dataSource;
}

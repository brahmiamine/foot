import "reflect-metadata";
import { DataSource } from "typeorm";
import { ClubSanction, ClubSanctionHistory } from "@/entities/ClubSanction";
import { Federation } from "@/entities/Federation";
import { LegalCase, LegalCaseDecision, LegalCaseDocument, LegalCaseEvent, LegalCaseHearing } from "@/entities/LegalCase";
import { News } from "@/entities/News";
import { NotificationOutboxEvent } from "@/entities/NotificationOutboxEvent";
import { Player } from "@/entities/Player";
import { PlayerTransfer } from "@/entities/PlayerTransfer";
import { Product } from "@/entities/Product";
import { ProductCategory } from "@/entities/ProductCategory";
import { ProcessedWebhookEvent } from "@/entities/ProcessedWebhookEvent";
import { ShopOrder } from "@/entities/ShopOrder";
import { ShopOrderItem } from "@/entities/ShopOrderItem";
import { Staff } from "@/entities/Staff";
import { StockUnavailableRefund } from "@/entities/StockUnavailableRefund";
import { Team } from "@/entities/Team";
import { TeamMember } from "@/entities/TeamMember";

/**
 * DataSource SQLite en mémoire, isolée et jetable, avec les vraies entités
 * TypeORM — utilisée par les tests d'intégration pour exécuter du vrai SQL
 * sans dépendre d'un serveur MySQL. Même pattern que
 * ticketing/src/test/testDataSource.ts. Scope volontairement limité aux
 * entités touchées par la boutique (voir ShopOrderService.ts), l'outbox
 * notification (voir NotificationOutboxService.ts, TS-25/TS-26) et les
 * transferts de joueurs (voir PlayerTransferService.ts, migration.md §19-21).
 */
export async function createTestDataSource(): Promise<DataSource> {
  const dataSource = new DataSource({
    type: "better-sqlite3",
    database: ":memory:",
    dropSchema: true,
    synchronize: true,
    entities: [ClubSanction, ClubSanctionHistory, Federation, LegalCase, LegalCaseDecision, LegalCaseDocument, LegalCaseEvent, LegalCaseHearing, News, NotificationOutboxEvent, Player, PlayerTransfer, Product, ProductCategory, ProcessedWebhookEvent, ShopOrder, ShopOrderItem, Staff, StockUnavailableRefund, Team, TeamMember],
  });

  await dataSource.initialize();
  return dataSource;
}

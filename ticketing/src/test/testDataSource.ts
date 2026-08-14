import "reflect-metadata";
import { DataSource } from "typeorm";
import { Match } from "@/entities/Match";
import { MatchCancellationRefund } from "@/entities/MatchCancellationRefund";
import { MatchTicketCategory } from "@/entities/MatchTicketCategory";
import { ProcessedWebhookEvent } from "@/entities/ProcessedWebhookEvent";
import { StockUnavailableRefund } from "@/entities/StockUnavailableRefund";
import { Team } from "@/entities/Team";
import { Ticket } from "@/entities/Ticket";
import { TicketCategory } from "@/entities/TicketCategory";
import { TicketSaleRule } from "@/entities/TicketSaleRule";
import { TicketScanLog } from "@/entities/TicketScanLog";

/**
 * DataSource SQLite en mémoire, isolée et jetable, avec les vraies entités
 * TypeORM — utilisée par les tests d'intégration pour exécuter du vrai SQL
 * (jointures, contraintes) sans dépendre d'un serveur MySQL. Même pattern
 * que referee-center/src/test/testDataSource.ts.
 */
export async function createTestDataSource(): Promise<DataSource> {
  const dataSource = new DataSource({
    type: "better-sqlite3",
    database: ":memory:",
    dropSchema: true,
    synchronize: true,
    entities: [Match, MatchCancellationRefund, MatchTicketCategory, ProcessedWebhookEvent, StockUnavailableRefund, Team, Ticket, TicketCategory, TicketSaleRule, TicketScanLog],
  });

  await dataSource.initialize();
  return dataSource;
}

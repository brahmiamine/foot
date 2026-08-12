import "reflect-metadata";
import { DataSource } from "typeorm";
import { Match } from "@/entities/Match";
import { MatchTicketCategory } from "@/entities/MatchTicketCategory";
import { Team } from "@/entities/Team";
import { Ticket } from "@/entities/Ticket";
import { TicketCategory } from "@/entities/TicketCategory";
import { TicketSaleRule } from "@/entities/TicketSaleRule";

/**
 * DataSource SQLite en mémoire, isolée et jetable, avec les vraies entités
 * TypeORM — utilisée par les tests d'intégration pour exécuter du vrai SQL
 * (jointures, contraintes) sans dépendre d'un serveur MySQL. Même pattern
 * que arbinote/src/test/testDataSource.ts.
 */
export async function createTestDataSource(): Promise<DataSource> {
  const dataSource = new DataSource({
    type: "better-sqlite3",
    database: ":memory:",
    dropSchema: true,
    synchronize: true,
    entities: [Match, MatchTicketCategory, Team, Ticket, TicketCategory, TicketSaleRule],
  });

  await dataSource.initialize();
  return dataSource;
}

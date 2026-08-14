import "reflect-metadata";
import { DataSource } from "typeorm";
import { Match } from "@/entities/Match";
import { Team } from "@/entities/Team";
import { Federation } from "@/entities/Federation";
import { Goal } from "@/entities/Goal";
import { Card } from "@/entities/Card";
import { Substitution } from "@/entities/Substitution";
import { Injury } from "@/entities/Injury";
import { Player } from "@/entities/Player";

/**
 * DataSource SQLite en mémoire, avec les vraies entités TypeORM — utilisée
 * par les tests d'intégration (TS-36) pour exercer du vrai SQL sans
 * dépendre d'un serveur MySQL. Même pattern que
 * referee-center/ticketing/identity/seller-portal (src/test/testDataSource.ts).
 */
export async function createTestDataSource(): Promise<DataSource> {
  const dataSource = new DataSource({
    type: "better-sqlite3",
    database: ":memory:",
    dropSchema: true,
    synchronize: true,
    entities: [Match, Team, Federation, Goal, Card, Substitution, Injury, Player],
  });

  await dataSource.initialize();
  return dataSource;
}

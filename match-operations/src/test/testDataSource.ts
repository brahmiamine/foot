import "reflect-metadata";
import { DataSource } from "typeorm";
import { Card } from "@/entities/Card";
import { CardReason } from "@/entities/CardReason";
import { Federation } from "@/entities/Federation";
import { Goal } from "@/entities/Goal";
import { Injury } from "@/entities/Injury";
import { Match } from "@/entities/Match";
import { Matchday } from "@/entities/Matchday";
import { MatchEventCorrection } from "@/entities/MatchEventCorrection";
import { MatchOfficialAssignment } from "@/entities/MatchOfficialAssignment";
import { MatchReopenLog } from "@/entities/MatchReopenLog";
import { Player } from "@/entities/Player";
import { Sheet } from "@/entities/Sheet";
import { Signature } from "@/entities/Signature";
import { Substitution } from "@/entities/Substitution";
import { Team } from "@/entities/Team";

/**
 * DataSource SQLite en mémoire, isolée et jetable, avec les vraies entités
 * TypeORM — utilisée par les tests d'intégration pour exécuter du vrai SQL
 * sans dépendre d'un serveur MySQL. Même pattern que
 * referee-center/src/test/testDataSource.ts et ticketing/src/test/testDataSource.ts.
 */
export async function createTestDataSource(): Promise<DataSource> {
  const dataSource = new DataSource({
    type: "better-sqlite3",
    database: ":memory:",
    dropSchema: true,
    synchronize: true,
    entities: [
      Card,
      CardReason,
      Federation,
      Goal,
      Injury,
      Match,
      Matchday,
      MatchEventCorrection,
      MatchOfficialAssignment,
      MatchReopenLog,
      Player,
      Sheet,
      Signature,
      Substitution,
      Team,
    ],
  });

  await dataSource.initialize();
  return dataSource;
}

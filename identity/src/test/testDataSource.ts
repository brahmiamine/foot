import "reflect-metadata";
import { DataSource } from "typeorm";
import { User } from "@/entities/User";
import { Team } from "@/entities/Team";
import { MemberTeamAffiliation } from "@/entities/MemberTeamAffiliation";
import { PasswordResetToken } from "@/entities/PasswordResetToken";
import { SecurityEvent } from "@/entities/SecurityEvent";
import { MfaEnrollmentChallenge } from "@/entities/MfaEnrollmentChallenge";

/**
 * DataSource SQLite en mémoire, avec les vraies entités TypeORM (voir
 * src/lib/db.ts pour l'équivalent MySQL de production). Utilisé par les
 * tests d'intégration (TS-34) pour exercer du vrai SQL sans dépendre d'un
 * serveur MySQL. Même pattern que arbinote/ticketing
 * (src/test/testDataSource.ts).
 */
export async function createTestDataSource(): Promise<DataSource> {
  const dataSource = new DataSource({
    type: "better-sqlite3",
    database: ":memory:",
    dropSchema: true,
    synchronize: true,
    entities: [User, Team, MemberTeamAffiliation, PasswordResetToken, SecurityEvent, MfaEnrollmentChallenge],
  });

  await dataSource.initialize();
  return dataSource;
}

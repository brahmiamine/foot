import "reflect-metadata";
import { DataSource } from "typeorm";
import { User } from "@/entities/User";
import { Team } from "@/entities/Team";
import { MemberTeamAffiliation } from "@/entities/MemberTeamAffiliation";
import { PasswordResetToken } from "@/entities/PasswordResetToken";
import { SecurityEvent } from "@/entities/SecurityEvent";
import { MfaEnrollmentChallenge } from "@/entities/MfaEnrollmentChallenge";
import { AccountInvitation } from "@/entities/AccountInvitation";

/** DataSource SQLite en mémoire avec les vraies entités Identity. */
export async function createTestDataSource(): Promise<DataSource> {
  const dataSource = new DataSource({
    type: "better-sqlite3",
    database: ":memory:",
    dropSchema: true,
    synchronize: true,
    entities: [
      User,
      Team,
      MemberTeamAffiliation,
      PasswordResetToken,
      SecurityEvent,
      MfaEnrollmentChallenge,
      AccountInvitation,
    ],
  });

  await dataSource.initialize();
  return dataSource;
}

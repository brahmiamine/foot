import "reflect-metadata";
import { DataSource } from "typeorm";
import { User } from "@/entities/User";
import { Team } from "@/entities/Team";
import { MemberTeamAffiliation } from "@/entities/MemberTeamAffiliation";
import { PasswordResetToken } from "@/entities/PasswordResetToken";
import { SecurityEvent } from "@/entities/SecurityEvent";
import { AccountInvitation } from "@/entities/AccountInvitation";
import { MfaRolePolicy } from "@/entities/MfaRolePolicy";

const globalForDataSource = globalThis as unknown as {
  dataSource?: DataSource;
  dataSourceInit?: Promise<DataSource>;
};

function createDataSource() {
  const { DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME, DB_LOGGING } = process.env;

  if (!DB_HOST || !DB_USER || !DB_NAME) {
    throw new Error("Missing MySQL configuration. Please set DB_HOST, DB_USER and DB_NAME in .env.local");
  }

  return new DataSource({
    type: "mysql",
    host: DB_HOST,
    port: DB_PORT ? Number(DB_PORT) : 3306,
    username: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
    logging: DB_LOGGING === "true",
    synchronize: false,
    entities: [
      User,
      Team,
      MemberTeamAffiliation,
      PasswordResetToken,
      SecurityEvent,
      AccountInvitation,
      MfaRolePolicy,
    ],
  });
}

/**
 * Next.js peut déclencher plusieurs appels concurrents à getDataSource()
 * avant la fin de la première initialisation ; on mémorise la promesse en
 * cours pour que tout le monde attende la même instance.
 */
export async function getDataSource(): Promise<DataSource> {
  if (globalForDataSource.dataSource?.isInitialized) {
    return globalForDataSource.dataSource;
  }

  if (!globalForDataSource.dataSourceInit) {
    const dataSource = createDataSource();
    globalForDataSource.dataSourceInit = dataSource.initialize().then((ds) => {
      globalForDataSource.dataSource = ds;
      return ds;
    });
  }

  return globalForDataSource.dataSourceInit;
}

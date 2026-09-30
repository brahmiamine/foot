import "reflect-metadata";
import { DataSource } from "typeorm";
import { User } from "@/entities/User";
import { Team } from "@/entities/Team";
import { MemberTeamAffiliation } from "@/entities/MemberTeamAffiliation";
import { PasswordResetToken } from "@/entities/PasswordResetToken";
import { SecurityEvent } from "@/entities/SecurityEvent";
import { AccountInvitation } from "@/entities/AccountInvitation";
import { MfaRolePolicy } from "@/entities/MfaRolePolicy";
import { IdentityPolicyAudit } from "@/entities/IdentityPolicyAudit";
import { MemberRegistrationPolicy } from "@/entities/MemberRegistrationPolicy";
import { MemberRegistrationRequest } from "@/entities/MemberRegistrationRequest";
import { UserSession } from "@/entities/UserSession";
import { MfaEnrollmentChallenge } from "@/entities/MfaEnrollmentChallenge";

const ENTITIES = [
  User,
  Team,
  MemberTeamAffiliation,
  PasswordResetToken,
  SecurityEvent,
  AccountInvitation,
  MfaRolePolicy,
  IdentityPolicyAudit,
  MemberRegistrationPolicy,
  MemberRegistrationRequest,
  UserSession,
  MfaEnrollmentChallenge,
];

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
    entities: ENTITIES,
  });
}

/**
 * Next.js (dev, `--webpack`) compile certaines routes à la demande dans des
 * chunks distincts : les classes d'entités importées par une route
 * fraîchement compilée peuvent alors être des objets différents de celles
 * utilisées pour construire la DataSource mise en cache (même fichier
 * source, identité de classe différente). TypeORM résout ses métadonnées
 * par référence de classe, donc `getRepository(User)` échoue avec
 * `EntityMetadataNotFoundError` bien que la DataSource soit "initialized".
 * On détecte ce cas (métadonnées manquantes pour une entité qu'on sait
 * enregistrée) et on reconstruit une DataSource fraîche plutôt que de
 * renvoyer l'instance périmée. Sans effet en production (un seul bundle).
 */
function isStale(dataSource: DataSource): boolean {
  return !ENTITIES.every((entity) => dataSource.hasMetadata(entity));
}

/**
 * Next.js peut déclencher plusieurs appels concurrents à getDataSource()
 * avant la fin de la première initialisation ; on mémorise la promesse en
 * cours pour que tout le monde attende la même instance.
 */
export async function getDataSource(): Promise<DataSource> {
  if (globalForDataSource.dataSource?.isInitialized) {
    if (!isStale(globalForDataSource.dataSource)) {
      return globalForDataSource.dataSource;
    }
    const stale = globalForDataSource.dataSource;
    globalForDataSource.dataSource = undefined;
    globalForDataSource.dataSourceInit = undefined;
    await stale.destroy().catch(() => {});
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

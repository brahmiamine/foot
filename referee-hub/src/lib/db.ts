import "reflect-metadata";
import { DataSource } from "typeorm";
import { Assignment } from "@/entities/Assignment";
import { AssignmentResponse } from "@/entities/AssignmentResponse";
import { ReplacementRequest } from "@/entities/ReplacementRequest";
import { League } from "@/entities/League";
import { Match } from "@/entities/Match";
import { Matchday } from "@/entities/Matchday";
import { Referee } from "@/entities/Referee";
import { Season } from "@/entities/Season";
import { Team } from "@/entities/Team";
import { User } from "@/entities/User";
import { RefereeMatchReport } from "@/entities/RefereeMatchReport";
import { RefereeUnavailability } from "@/entities/RefereeUnavailability";
import { RefereeUnavailabilityPolicy } from "@/entities/RefereeUnavailabilityPolicy";
import { RefereeReportPolicy } from "@/entities/RefereeReportPolicy";
import { RefereeConflictDeclaration } from "@/entities/RefereeConflictDeclaration";
import { RefereeConfigurationAudit } from "@/entities/RefereeConfigurationAudit";
import { RefereeReportSlaAlert } from "@/entities/RefereeReportSlaAlert";

const globalForDataSource = globalThis as unknown as {
  refereeHubDataSource?: DataSource | null;
  refereeHubDataSourceInit?: Promise<DataSource> | null;
};

let dataSource: DataSource | null = globalForDataSource.refereeHubDataSource ?? null;
let initPromise: Promise<DataSource> | null = globalForDataSource.refereeHubDataSourceInit ?? null;

const ENTITIES = [
  Assignment,
  AssignmentResponse,
  ReplacementRequest,
  League,
  Match,
  Matchday,
  Referee,
  RefereeMatchReport,
  RefereeUnavailability,
  RefereeUnavailabilityPolicy,
  RefereeReportPolicy,
  RefereeConflictDeclaration,
  RefereeConfigurationAudit,
  RefereeReportSlaAlert,
  Season,
  Team,
  User,
];

/**
 * Next.js (dev, `--webpack`) compile certaines routes à la demande dans des
 * chunks distincts : les classes d'entités importées par une route
 * fraîchement compilée peuvent être des objets différents de ceux utilisés
 * pour construire la DataSource mise en cache (même fichier source, identité
 * de classe différente). TypeORM résout ses métadonnées par référence de
 * classe, donc `getRepository(X)` échoue avec « No metadata for X was found »
 * alors que la DataSource est "initialized". On détecte ce cas et on
 * reconstruit une DataSource fraîche. Sans effet en production (un bundle).
 */
function isStale(ds: DataSource): boolean {
  return !ENTITIES.every((entity) => ds.hasMetadata(entity));
}

export async function getDataSource(): Promise<DataSource> {
  if (dataSource?.isInitialized) {
    if (!isStale(dataSource)) {
      return dataSource;
    }
    const stale = dataSource;
    dataSource = null;
    initPromise = null;
    globalForDataSource.refereeHubDataSource = null;
    globalForDataSource.refereeHubDataSourceInit = null;
    await stale.destroy().catch(() => {});
  }

  if (!initPromise) {
    const nextDataSource = new DataSource({
      type: "mariadb",
      host: process.env.DB_HOST || "localhost",
      port: Number.parseInt(process.env.DB_PORT || "3306", 10),
      username: process.env.DB_USER || "root",
      password: process.env.DB_PASSWORD || "",
      database: process.env.DB_NAME || "foot",
      synchronize: false,
      logging: process.env.NODE_ENV === "development",
      charset: "utf8mb4",
      timezone: "Z",
      entities: ENTITIES,
    });
    initPromise = nextDataSource.initialize().then((initialized) => {
      dataSource = initialized;
      globalForDataSource.refereeHubDataSource = initialized;
      globalForDataSource.refereeHubDataSourceInit = initPromise;
      return initialized;
    });
  }

  return initPromise;
}
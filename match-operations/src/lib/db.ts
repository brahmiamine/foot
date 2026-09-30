import "reflect-metadata";
import { DataSource } from "typeorm";
import { Federation } from "@/entities/Federation";
import { Team } from "@/entities/Team";
import { Matchday } from "@/entities/Matchday";
import { Match } from "@/entities/Match";
import { Player } from "@/entities/Player";
import { Card } from "@/entities/Card";
import { CardReason } from "@/entities/CardReason";
import { MatchLineup } from "@/entities/MatchLineup";
import { Sheet } from "@/entities/Sheet";
import { SheetAmendment } from "@/entities/SheetAmendment";
import { Signature } from "@/entities/Signature";
import { Goal } from "@/entities/Goal";
import { Injury } from "@/entities/Injury";
import { Substitution } from "@/entities/Substitution";
import { Reservation } from "@/entities/Reservation";
import { MatchOfficial } from "@/entities/MatchOfficial";
import { MatchOfficialAssignment } from "@/entities/MatchOfficialAssignment";
import { MatchStaffAssignment, MatchStaffRead, CoachQualificationRead } from "@/entities/MatchStaffAssignment";
import { PlayerControl } from "@/entities/PlayerControl";
import { MatchReopenLog } from "@/entities/MatchReopenLog";
import { TeamMembership } from "@/entities/TeamMembership";
import { RefereeUnavailability } from "@/entities/RefereeUnavailability";
import { CompetitionMatchProtocol } from "@/entities/CompetitionMatchProtocol";
import { MatchOfficialDesignationPolicy } from "@/entities/MatchOfficialDesignationPolicy";
import { CompetitionRegistrationRead, EligibilityCheckWrite, MedicalEligibilityRead, PersonLicenseRead, PlayerContractRead, PlayerRegistrationRead, PlayerTransferRead, RegulatoryLegacyConfirmationRead, SeasonRegulation, SuspensionRead } from "@/entities/Eligibility";

const globalForDataSource = globalThis as unknown as {
  matchOperationsDataSource?: DataSource | null;
  matchOperationsDataSourceInit?: Promise<DataSource> | null;
};

let dataSource: DataSource | null = globalForDataSource.matchOperationsDataSource ?? null;
let initPromise: Promise<DataSource> | null = globalForDataSource.matchOperationsDataSourceInit ?? null;

const ENTITIES = [
  Federation,
  Team,
  Matchday,
  Match,
  Player,
  Card,
  CardReason,
  MatchLineup,
  Sheet,
  SheetAmendment,
  Signature,
  Goal,
  Injury,
  Substitution,
  Reservation,
  MatchOfficial,
  MatchOfficialAssignment,
  MatchStaffAssignment,
  MatchStaffRead,
  CoachQualificationRead,
  PlayerControl,
  MatchReopenLog,
  TeamMembership,
  RefereeUnavailability,
  CompetitionMatchProtocol,
  MatchOfficialDesignationPolicy,
  CompetitionRegistrationRead,
  EligibilityCheckWrite,
  MedicalEligibilityRead,
  PersonLicenseRead,
  PlayerContractRead,
  PlayerRegistrationRead,
  PlayerTransferRead,
  RegulatoryLegacyConfirmationRead,
  SeasonRegulation,
  SuspensionRead,
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
  if (dataSource && dataSource.isInitialized) {
    if (!isStale(dataSource)) {
      return dataSource;
    }
    const stale = dataSource;
    dataSource = null;
    initPromise = null;
    globalForDataSource.matchOperationsDataSource = null;
    globalForDataSource.matchOperationsDataSourceInit = null;
    await stale.destroy().catch(() => {});
  }

  if (!initPromise) {
    const newDataSource = new DataSource({
      type: "mariadb",
      host: process.env.DB_HOST || "localhost",
      port: parseInt(process.env.DB_PORT || "3306", 10),
      username: process.env.DB_USER || "root",
      password: process.env.DB_PASSWORD || "",
      database: process.env.DB_NAME || "foot",
      synchronize: false,
      logging: process.env.NODE_ENV === "development",
      entities: ENTITIES,
      migrations: [],
      charset: "utf8mb4",
      timezone: "Z",
    });

    initPromise = newDataSource.initialize().then((ds) => {
      dataSource = ds;
      globalForDataSource.matchOperationsDataSource = ds;
      globalForDataSource.matchOperationsDataSourceInit = initPromise;
      return ds;
    });
  }

  return initPromise;
}

import "reflect-metadata";

import { DataSource } from "typeorm";
import { Team } from "@/entities/Team";
import { TeamBranding } from "@/entities/TeamBranding";
import { Player } from "@/entities/Player";
import { Role } from "@/entities/Role";
import { UserRole } from "@/entities/UserRole";
import { Injury } from "@/entities/Injury";
import { InjuryFollowUp } from "@/entities/InjuryFollowUp";
import { InjuryClearance } from "@/entities/InjuryClearance";
import { MedicalSettings } from "@/entities/MedicalSettings";

/**
 * Connexion TypeORM vers la base "foot" partagée. Medical Hub est le seul
 * portail qui expose le dossier clinique complet ; les autres apps ne doivent
 * consommer que des projections opérationnelles sans diagnostic/documents.
 */
const globalForDataSource = globalThis as unknown as {
  medicalHubDataSource?: DataSource | null;
  medicalHubDataSourceInit?: Promise<DataSource> | null;
};

let dataSource: DataSource | null = globalForDataSource.medicalHubDataSource ?? null;
let initPromise: Promise<DataSource> | null = globalForDataSource.medicalHubDataSourceInit ?? null;

const ENTITIES = [
  Team,
  TeamBranding,
  Player,
  Role,
  UserRole,
  Injury,
  InjuryFollowUp,
  InjuryClearance,
  MedicalSettings,
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
    globalForDataSource.medicalHubDataSource = null;
    globalForDataSource.medicalHubDataSourceInit = null;
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
      globalForDataSource.medicalHubDataSource = ds;
      globalForDataSource.medicalHubDataSourceInit = initPromise;
      return ds;
    });
  }

  return initPromise;
}

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
let dataSource: DataSource | null = null;
let initPromise: Promise<DataSource> | null = null;

export async function getDataSource(): Promise<DataSource> {
  if (dataSource && dataSource.isInitialized) {
    return dataSource;
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
      entities: [
        Team,
        TeamBranding,
        Player,
        Role,
        UserRole,
        Injury,
        InjuryFollowUp,
        InjuryClearance,
        MedicalSettings,
      ],
      migrations: [],
      charset: "utf8mb4",
      timezone: "Z",
    });

    initPromise = newDataSource.initialize().then((ds) => {
      dataSource = ds;
      return ds;
    });
  }

  return initPromise;
}

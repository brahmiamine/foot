import "reflect-metadata";

import { DataSource } from "typeorm";
import { Team } from "@/entities/Team";
import { TeamBranding } from "@/entities/TeamBranding";
import { Player } from "@/entities/Player";
import { Role } from "@/entities/Role";
import { UserRole } from "@/entities/UserRole";
import { Injury } from "@/entities/Injury";

/**
 * Connexion TypeORM vers la base "foot" partagée — voir
 * club-hub/src/lib/database.ts et player-hub|staff-hub (même pattern).
 * medical-hub lit ET écrit uniquement `cms_injuries` (déjà possédée par
 * club-hub) : c'est le RBAC existant (cms_roles/cms_user_roles, permission
 * "medical.*") qui décide qui y a accès, pas une frontière technique entre
 * les apps.
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
      entities: [Team, TeamBranding, Player, Role, UserRole, Injury],
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

import "reflect-metadata";

import { DataSource } from "typeorm";
import { Team } from "@/entities/Team";
import { TeamBranding } from "@/entities/TeamBranding";
import { Player } from "@/entities/Player";
import { Staff } from "@/entities/Staff";
import { Role } from "@/entities/Role";
import { UserRole } from "@/entities/UserRole";
import { Match } from "@/entities/Match";
import { FriendlyMatch } from "@/entities/FriendlyMatch";
import { Convocation } from "@/entities/Convocation";
import { Training } from "@/entities/Training";
import { TrainingInvitation } from "@/entities/TrainingInvitation";
import { PlayerStat } from "@/entities/PlayerStat";
import { Card } from "@/entities/Card";
import { Suspension } from "@/entities/Suspension";
import { Fine } from "@/entities/Fine";
import { Trip } from "@/entities/Trip";
import { TripParticipant } from "@/entities/TripParticipant";
import { Injury } from "@/entities/Injury";
import { MatchLineup } from "@/entities/MatchLineup";
import { MatchFormation } from "@/entities/MatchFormation";
import { TacticsBoard } from "@/entities/TacticsBoard";
import { LineupLockPolicy } from "@/entities/LineupLockPolicy";
import { TrainingApprovalPolicy } from "@/entities/TrainingApprovalPolicy";
import { StatReviewPolicy } from "@/entities/StatReviewPolicy";
import { HeadCoachDelegation } from "@/entities/HeadCoachDelegation";
import { StaffConfigurationAudit } from "@/entities/StaffConfigurationAudit";

/**
 * Connexion TypeORM vers la base "foot" partagée — voir
 * club-hub/src/lib/database.ts et player-hub/src/lib/database.ts (même
 * pattern). staff-hub lit ET écrit sur les tables cms_* déjà possédées par
 * club-hub (entraînements, convocations, compositions, statistiques,
 * déplacements) : c'est le même RBAC (cms_roles/cms_user_roles) qui décide
 * qui peut faire quoi, pas une frontière technique entre les deux apps.
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
        Staff,
        Role,
        UserRole,
        Match,
        FriendlyMatch,
        Convocation,
        Training,
        TrainingInvitation,
        PlayerStat,
        Card,
        Suspension,
        Fine,
        Trip,
        TripParticipant,
        Injury,
        MatchLineup,
        MatchFormation,
        TacticsBoard,
        LineupLockPolicy,
        TrainingApprovalPolicy,
        StatReviewPolicy,
        HeadCoachDelegation,
        StaffConfigurationAudit,
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

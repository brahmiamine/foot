import "reflect-metadata";

import { DataSource } from "typeorm";
import { Team } from "@/entities/Team";
import { TeamBranding } from "@/entities/TeamBranding";
import { Player } from "@/entities/Player";
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

/**
 * Connexion TypeORM vers la base "foot" partagée avec identity/match-operations/
 * arbinote/federation-hub/club-hub/seller-portal — voir club-hub/src/lib/database.ts
 * (même pattern). player-hub ne possède aucune de ces tables : lecture des
 * données déjà gérées par club-hub, écriture limitée aux réponses du joueur
 * connecté (Convocation.response, TrainingInvitation.response,
 * TripParticipant.transportOffer — voir services/PlayerPortalService.ts).
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

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
import { Signature } from "@/entities/Signature";
import { Goal } from "@/entities/Goal";
import { Injury } from "@/entities/Injury";
import { Substitution } from "@/entities/Substitution";
import { Reservation } from "@/entities/Reservation";
import { MatchOfficial } from "@/entities/MatchOfficial";
import { PlayerControl } from "@/entities/PlayerControl";
import { User } from "@/entities/User";
import { PlatformNotification } from "@/entities/PlatformNotification";
import { NotificationPreference } from "@/entities/NotificationPreference";

/**
 * Connexion TypeORM vers la base "foot", partagée avec superadmin,
 * teamManager et arbinote. matchsheet ne fait que lire les référentiels
 * (matches/teams/joueurs/motifs de carton/composition) et possède ses
 * propres tables additives ms_* (feuille de match, signatures, événements).
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
        Federation,
        Team,
        Matchday,
        Match,
        Player,
        Card,
        CardReason,
        MatchLineup,
        Sheet,
        Signature,
        Goal,
        Injury,
        Substitution,
        Reservation,
        MatchOfficial,
        PlayerControl,
        User,
        PlatformNotification,
        NotificationPreference,
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

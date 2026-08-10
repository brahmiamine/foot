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
import { AuditLog } from "@/entities/AuditLog";

/**
 * Connexion TypeORM vers la base "foot", partagée avec superadmin,
 * teamManager et arbinote. matchsheet lit les référentiels
 * (matches/teams/joueurs/motifs de carton/composition), possède ses
 * propres tables additives ms_* (feuille de match, signatures, événements),
 * et écrit dans `audit_logs` (journal d'audit partagé avec
 * arbinote/superadmin — voir src/lib/auditLog.ts). Les cartons ne sont plus
 * écrits directement ici : voir src/services/CardEventService.ts qui
 * délègue à l'API interne de teamManager (amende + suspension).
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
        AuditLog,
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

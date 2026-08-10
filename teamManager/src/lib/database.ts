// Import reflect-metadata FIRST - required for TypeORM decorators
// This must be imported before any entity imports
import "reflect-metadata";

import { DataSource } from "typeorm";
import { Federation } from "@/entities/Federation";
import { Stadium } from "@/entities/Stadium";
import { Team } from "@/entities/Team";
import { News } from "@/entities/News";
import { Player } from "@/entities/Player";
import { TeamMember } from "@/entities/TeamMember";
import { Staff } from "@/entities/Staff";
import { MediaItem } from "@/entities/MediaItem";
import { MediaGallery } from "@/entities/MediaGallery";
import { MediaGalleryItem } from "@/entities/MediaGalleryItem";
import { NewsMedia } from "@/entities/NewsMedia";
import { MatchGallery } from "@/entities/MatchGallery";
import { Match } from "@/entities/Match";
import { User } from "@/entities/User";
import { CardReason } from "@/entities/CardReason";
import { Card } from "@/entities/Card";
import { Suspension } from "@/entities/Suspension";
import { Fine } from "@/entities/Fine";
import { Note } from "@/entities/Note";
import { AuditLog } from "@/entities/AuditLog";
import { Settings } from "@/entities/Settings";
import { Matchday } from "@/entities/Matchday";
import { Notification } from "@/entities/Notification";
import { Convocation } from "@/entities/Convocation";
import { ProductCategory } from "@/entities/ProductCategory";
import { Product } from "@/entities/Product";
import { SponsorRequest } from "@/entities/SponsorRequest";
import { Sponsor } from "@/entities/Sponsor";
import { MatchLineup } from "@/entities/MatchLineup";
import { Role } from "@/entities/Role";
import { UserRole } from "@/entities/UserRole";
import { FriendlyMatch } from "@/entities/FriendlyMatch";
import { Training } from "@/entities/Training";
import { TrainingInvitation } from "@/entities/TrainingInvitation";
import { MatchFormation } from "@/entities/MatchFormation";
import { TacticsBoard } from "@/entities/TacticsBoard";
import { TrainingBlock } from "@/entities/TrainingBlock";
import { PlayerStat } from "@/entities/PlayerStat";
import { Injury } from "@/entities/Injury";
import { Trip } from "@/entities/Trip";
import { TripVehicle } from "@/entities/TripVehicle";
import { TripParticipant } from "@/entities/TripParticipant";
import { Season } from "@/entities/Season";
import { InternalTeam } from "@/entities/InternalTeam";
import { License } from "@/entities/License";
import { Guardian } from "@/entities/Guardian";
import { PlayerGuardian } from "@/entities/PlayerGuardian";

/**
 * Database connection configuration
 * Uses TypeORM with MariaDB — base "foot" partagée avec ArbiNote et cardManager.
 * Federation/Team/Match sont mappées sur leurs tables existantes (mêmes
 * UUID) ; tout le reste est propre à cette app (préfixe cms_).
 */
let dataSource: DataSource | null = null;
// Next.js rend layout + page en parallèle : plusieurs appels concurrents à
// getDataSource() peuvent arriver avant la fin de la première initialisation.
// On mémorise la promesse en cours pour que tout le monde attende la MÊME
// instance au lieu d'en créer une seconde qui écraserait la première.
let initPromise: Promise<DataSource> | null = null;

/**
 * Get or create database connection
 * @returns DataSource instance
 */
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
      synchronize: false, // Never use synchronize in production
      logging: process.env.NODE_ENV === "development",
      entities: [Federation, Stadium, Team, News, Player, TeamMember, Staff, MediaItem, MediaGallery, MediaGalleryItem, NewsMedia, MatchGallery, Match, User, CardReason, Card, Suspension, Fine, Note, AuditLog, Settings, Matchday, Notification, Convocation, ProductCategory, Product, SponsorRequest, Sponsor, MatchLineup, Role, UserRole, FriendlyMatch, Training, TrainingInvitation, MatchFormation, TacticsBoard, TrainingBlock, PlayerStat, Injury, Trip, TripVehicle, TripParticipant, Season, InternalTeam, License, Guardian, PlayerGuardian], // Import entities directly instead of using glob patterns
      migrations: [], // Add migrations as needed
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

/**
 * Close database connection
 */
export async function closeDataSource(): Promise<void> {
  if (dataSource && dataSource.isInitialized) {
    await dataSource.destroy();
    dataSource = null;
    initPromise = null;
  }
}

import "reflect-metadata";

import { DataSource } from "typeorm";
import { Federation } from "@/entities/Federation";
import { Team } from "@/entities/Team";
import { Match } from "@/entities/Match";
import { News } from "@/entities/News";
import { Player } from "@/entities/Player";
import { Stadium } from "@/entities/Stadium";
import { MediaGallery } from "@/entities/MediaGallery";
import { MediaGalleryItem } from "@/entities/MediaGalleryItem";
import { MediaItem } from "@/entities/MediaItem";
import { Product } from "@/entities/Product";
import { ObMember } from "@/entities/ObMember";
import { ObFollow } from "@/entities/ObFollow";
import { ObPointsLedgerEntry } from "@/entities/ObPointsLedgerEntry";
import { ObBadge } from "@/entities/ObBadge";
import { ObMemberBadge } from "@/entities/ObMemberBadge";
import { ObPost } from "@/entities/ObPost";
import { ObComment } from "@/entities/ObComment";
import { ObReaction } from "@/entities/ObReaction";
import { ObPoll } from "@/entities/ObPoll";
import { ObPollOption } from "@/entities/ObPollOption";
import { ObPollVote } from "@/entities/ObPollVote";
import { ObPrediction } from "@/entities/ObPrediction";
import { CommunityUser } from "@/entities/CommunityUser";
import { ObReport } from "@/entities/ObReport";
import { ObModerationLog } from "@/entities/ObModerationLog";
import { ObFanWallItem } from "@/entities/ObFanWallItem";

/**
 * Connexion à la base "foot" partagée avec arbinote, superadmin et
 * teamManager (mêmes tables, voir ../teamManager/src/lib/database.ts).
 * Ce site reste lecture seule sur les tables vitrine (Federation, Team,
 * Match, News, Player, Stadium, galerie, Product — gérées par
 * teamManager/superadmin/arbinote), mais lit ET écrit dans ses propres
 * tables `ob_*` (communauté des supporters, voir ob/sql/migration_community_phase1.sql).
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
        Match,
        News,
        Player,
        Stadium,
        MediaGallery,
        MediaGalleryItem,
        MediaItem,
        Product,
        ObMember,
        ObFollow,
        ObPointsLedgerEntry,
        ObBadge,
        ObMemberBadge,
        ObPost,
        ObComment,
        ObReaction,
        ObPoll,
        ObPollOption,
        ObPollVote,
        ObPrediction,
        CommunityUser,
        ObReport,
        ObModerationLog,
        ObFanWallItem,
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

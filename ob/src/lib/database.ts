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

/**
 * Connexion en lecture seule à la base "foot" partagée avec arbinote,
 * superadmin et teamManager (mêmes tables, voir ../teamManager/src/lib/database.ts).
 * Ce site public n'écrit jamais dans ces tables.
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
      entities: [Federation, Team, Match, News, Player, Stadium, MediaGallery, MediaGalleryItem, MediaItem, Product],
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

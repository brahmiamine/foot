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
import { ClubInfo } from "@/entities/ClubInfo";
import { History } from "@/entities/History";
import { HistoryFigure } from "@/entities/HistoryFigure";
import { Honor } from "@/entities/Honor";
import { AcademyCategory } from "@/entities/AcademyCategory";
import { AcademyInfo } from "@/entities/AcademyInfo";
import { RecruitmentNeed } from "@/entities/RecruitmentNeed";
import { Announcement } from "@/entities/Announcement";
import { TeamSocials } from "@/entities/TeamSocials";
import { ContactInfo } from "@/entities/ContactInfo";
import { Sponsor } from "@/entities/Sponsor";
import { Goal } from "@/entities/Goal";
import { Substitution } from "@/entities/Substitution";
import { Injury } from "@/entities/Injury";
import { Card } from "@/entities/Card";

/**
 * Connexion en lecture seule à la base "foot" partagée avec arbinote,
 * federation-hub et club-hub (mêmes tables, voir ../club-hub/src/lib/database.ts).
 * Ce site public n'écrit jamais dans ces tables.
 */
const globalForDataSource = globalThis as unknown as {
  clubObDataSource?: DataSource | null;
  clubObDataSourceInit?: Promise<DataSource> | null;
};

let dataSource: DataSource | null = globalForDataSource.clubObDataSource ?? null;
let initPromise: Promise<DataSource> | null = globalForDataSource.clubObDataSourceInit ?? null;

const ENTITIES = [
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
  ClubInfo,
  History,
  HistoryFigure,
  Honor,
  AcademyCategory,
  AcademyInfo,
  RecruitmentNeed,
  Announcement,
  TeamSocials,
  ContactInfo,
  Sponsor,
  Goal,
  Substitution,
  Injury,
  Card,
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
    globalForDataSource.clubObDataSource = null;
    globalForDataSource.clubObDataSourceInit = null;
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
      globalForDataSource.clubObDataSource = ds;
      globalForDataSource.clubObDataSourceInit = initPromise;
      return ds;
    });
  }

  return initPromise;
}

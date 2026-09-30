// reflect-metadata doit être importé avant toute entité décorée par TypeORM.
import "reflect-metadata";

import { DataSource } from "typeorm";
import { Team } from "@/entities/Team";
import { Match } from "@/entities/Match";
import { TicketCategory } from "@/entities/TicketCategory";
import { MatchTicketCategory } from "@/entities/MatchTicketCategory";
import { TicketSaleRule } from "@/entities/TicketSaleRule";
import { TicketingGovernanceSettings } from "@/entities/TicketingGovernance";
import { Ticket } from "@/entities/Ticket";
import { TicketScanLog } from "@/entities/TicketScanLog";
import { ProcessedWebhookEvent } from "@/entities/ProcessedWebhookEvent";
import { StockUnavailableRefund } from "@/entities/StockUnavailableRefund";
import { MatchCancellationRefund } from "@/entities/MatchCancellationRefund";
import { TicketGrant } from "@/entities/TicketGrant";
import { ScanDevice } from "@/entities/ScanDevice";
import { TicketTransfer } from "@/entities/TicketTransfer";
import { SeasonPass } from "@/entities/SeasonPass";
import { SeasonPassRedemption } from "@/entities/SeasonPassRedemption";
import { TicketPromotion } from "@/entities/TicketPromotion";

/**
 * Connexion TypeORM vers la base MariaDB "foot" partagée avec les autres
 * apps du monorepo. Les tables propres à cette app sont préfixées `tk_`.
 */
const globalForDataSource = globalThis as unknown as {
  ticketingDataSource?: DataSource | null;
  ticketingDataSourceInit?: Promise<DataSource> | null;
};

let dataSource: DataSource | null = globalForDataSource.ticketingDataSource ?? null;
let initPromise: Promise<DataSource> | null = globalForDataSource.ticketingDataSourceInit ?? null;

const ENTITIES = [
  Team,
  Match,
  TicketCategory,
  MatchTicketCategory,
  TicketSaleRule,
  TicketingGovernanceSettings,
  Ticket,
  TicketScanLog,
  ProcessedWebhookEvent,
  StockUnavailableRefund,
  MatchCancellationRefund,
  TicketGrant,
  ScanDevice,
  TicketTransfer,
  SeasonPass,
  SeasonPassRedemption,
  TicketPromotion,
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
    globalForDataSource.ticketingDataSource = null;
    globalForDataSource.ticketingDataSourceInit = null;
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
      globalForDataSource.ticketingDataSource = ds;
      globalForDataSource.ticketingDataSourceInit = initPromise;
      return ds;
    });
  }

  return initPromise;
}

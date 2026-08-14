// reflect-metadata doit être importé avant toute entité décorée par TypeORM.
import "reflect-metadata";

import { DataSource } from "typeorm";
import { Team } from "@/entities/Team";
import { Match } from "@/entities/Match";
import { TicketCategory } from "@/entities/TicketCategory";
import { MatchTicketCategory } from "@/entities/MatchTicketCategory";
import { TicketSaleRule } from "@/entities/TicketSaleRule";
import { Ticket } from "@/entities/Ticket";
import { TicketScanLog } from "@/entities/TicketScanLog";
import { ProcessedWebhookEvent } from "@/entities/ProcessedWebhookEvent";
import { StockUnavailableRefund } from "@/entities/StockUnavailableRefund";
import { MatchCancellationRefund } from "@/entities/MatchCancellationRefund";

/**
 * Connexion TypeORM vers la base MariaDB "foot" partagée avec les autres
 * apps du monorepo (arbinote/federation-hub/club-hub/identity/ob/seller-portal/...).
 * Les tables propres à cette app sont préfixées `tk_` (Ticketing) ; `teams`
 * et `matches` sont lues en lecture seule, jamais dupliquées ni écrites ici.
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
      synchronize: false, // Jamais en production — voir sql/schema.sql
      logging: process.env.NODE_ENV === "development",
      entities: [Team, Match, TicketCategory, MatchTicketCategory, TicketSaleRule, Ticket, TicketScanLog, ProcessedWebhookEvent, StockUnavailableRefund, MatchCancellationRefund],
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

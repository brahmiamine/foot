import "reflect-metadata";

import { DataSource } from "typeorm";
import { Team } from "@/entities/Team";
import { Match } from "@/entities/Match";
import { MemberTeamAffiliation } from "@/entities/MemberTeamAffiliation";
import { TicketCategory } from "@/entities/TicketCategory";
import { MatchTicketCategory } from "@/entities/MatchTicketCategory";
import { TicketSaleRule } from "@/entities/TicketSaleRule";
import { Ticket } from "@/entities/Ticket";

/**
 * Connexion TypeORM vers la base MariaDB "foot" partagée avec les autres
 * apps du monorepo. `teams`/`matches`/`member_team_affiliations` sont lues
 * seules (gérées par superadmin/teamManager/sso) ; les tables `tk_*` sont
 * propres à cette app (préfixe "Ticketing").
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
      port: parseInt(process.env.DB_PORT || "3307", 10),
      username: process.env.DB_USER || "root",
      password: process.env.DB_PASSWORD || "",
      database: process.env.DB_NAME || "foot",
      synchronize: false, // Jamais en production — voir sql/schema.sql
      logging: process.env.NODE_ENV === "development",
      entities: [Team, Match, MemberTeamAffiliation, TicketCategory, MatchTicketCategory, TicketSaleRule, Ticket],
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

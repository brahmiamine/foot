import "reflect-metadata";
import { DataSource } from "typeorm";
import { Match } from "@/entities/Match";
import { MatchCancellationRefund } from "@/entities/MatchCancellationRefund";
import { MatchTicketCategory } from "@/entities/MatchTicketCategory";
import { ProcessedWebhookEvent } from "@/entities/ProcessedWebhookEvent";
import { StockUnavailableRefund } from "@/entities/StockUnavailableRefund";
import { Team } from "@/entities/Team";
import { Ticket } from "@/entities/Ticket";
import { TicketCategory } from "@/entities/TicketCategory";
import { TicketSaleRule } from "@/entities/TicketSaleRule";
import { TicketingGovernanceSettings } from "@/entities/TicketingGovernance";
import { TicketScanLog } from "@/entities/TicketScanLog";
import { TicketGrant } from "@/entities/TicketGrant";
import { ScanDevice } from "@/entities/ScanDevice";
import { TicketTransfer } from "@/entities/TicketTransfer";
import { SeasonPass } from "@/entities/SeasonPass";
import { SeasonPassRedemption } from "@/entities/SeasonPassRedemption";
import { TicketPromotion } from "@/entities/TicketPromotion";

export async function createTestDataSource(): Promise<DataSource> {
  const dataSource = new DataSource({
    type: "better-sqlite3",
    database: ":memory:",
    dropSchema: true,
    synchronize: true,
    entities: [
      Match,
      MatchCancellationRefund,
      MatchTicketCategory,
      ProcessedWebhookEvent,
      StockUnavailableRefund,
      Team,
      Ticket,
      TicketCategory,
      TicketSaleRule,
      TicketingGovernanceSettings,
      TicketScanLog,
      TicketGrant,
      ScanDevice,
      TicketTransfer,
      SeasonPass,
      SeasonPassRedemption,
      TicketPromotion,
    ],
  });
  await dataSource.initialize();
  return dataSource;
}

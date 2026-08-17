import "reflect-metadata";
import { DataSource } from "typeorm";
import { FootballAgent, RepresentationAgreement } from "@/entities/Agent";
import { Appeal, AppealDocument, AppealEvent } from "@/entities/Appeal";
import {
  ClubApprovalDecision,
  ClubApprovalRequest,
  ClubGovernanceSettings,
} from "@/entities/ClubGovernance";
import { ClubSanction, ClubSanctionHistory } from "@/entities/ClubSanction";
import { CoachQualification, CoachQualificationHistory } from "@/entities/CoachQualification";
import { Federation } from "@/entities/Federation";
import { FinancialCompliance, FinancialComplianceHistory } from "@/entities/FinancialCompliance";
import { BoardMandate, BoardMandateHistory, BoardMember } from "@/entities/Governance";
import { LegalCase, LegalCaseDecision, LegalCaseDocument, LegalCaseEvent, LegalCaseHearing } from "@/entities/LegalCase";
import { MediaItem } from "@/entities/MediaItem";
import { MedicalEligibility, MedicalEligibilityHistory } from "@/entities/MedicalEligibility";
import { News } from "@/entities/News";
import { NewsMedia } from "@/entities/NewsMedia";
import { NotificationOutboxEvent } from "@/entities/NotificationOutboxEvent";
import { Player } from "@/entities/Player";
import { PlayerTransfer } from "@/entities/PlayerTransfer";
import { Product } from "@/entities/Product";
import { ProductCategory } from "@/entities/ProductCategory";
import { ProcessedWebhookEvent } from "@/entities/ProcessedWebhookEvent";
import { SeasonRegulatoryCycle } from "@/entities/SeasonRegulatoryCycle";
import { ShopOrder } from "@/entities/ShopOrder";
import { ShopOrderItem } from "@/entities/ShopOrderItem";
import { Staff } from "@/entities/Staff";
import { StockUnavailableRefund } from "@/entities/StockUnavailableRefund";
import { Team } from "@/entities/Team";
import { TeamAffiliation } from "@/entities/TeamAffiliation";
import { TeamMember } from "@/entities/TeamMember";
import { TransferWindow } from "@/entities/Regulatory";

/**
 * DataSource SQLite en mémoire, isolée et jetable, avec les vraies entités
 * TypeORM. Il inclut aussi les entités de gouvernance éditoriale afin que les
 * tests News/Boutique exécutent le vrai workflow d'approbation et ses
 * fingerprints, au lieu de contourner le nouveau contrat serveur.
 */
export async function createTestDataSource(): Promise<DataSource> {
  const dataSource = new DataSource({
    type: "better-sqlite3",
    database: ":memory:",
    dropSchema: true,
    synchronize: true,
    entities: [
      Appeal,
      AppealDocument,
      AppealEvent,
      BoardMandate,
      BoardMandateHistory,
      BoardMember,
      ClubApprovalDecision,
      ClubApprovalRequest,
      ClubGovernanceSettings,
      ClubSanction,
      ClubSanctionHistory,
      CoachQualification,
      CoachQualificationHistory,
      Federation,
      FinancialCompliance,
      FinancialComplianceHistory,
      FootballAgent,
      RepresentationAgreement,
      LegalCase,
      LegalCaseDecision,
      LegalCaseDocument,
      LegalCaseEvent,
      LegalCaseHearing,
      MediaItem,
      MedicalEligibility,
      MedicalEligibilityHistory,
      News,
      NewsMedia,
      NotificationOutboxEvent,
      Player,
      PlayerTransfer,
      Product,
      ProductCategory,
      ProcessedWebhookEvent,
      SeasonRegulatoryCycle,
      ShopOrder,
      ShopOrderItem,
      Staff,
      StockUnavailableRefund,
      Team,
      TeamAffiliation,
      TeamMember,
      TransferWindow,
    ],
  });

  await dataSource.initialize();
  return dataSource;
}
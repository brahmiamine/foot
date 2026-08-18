// Import reflect-metadata FIRST - required for TypeORM decorators
// This must be imported before any entity imports
import "reflect-metadata";

import { DataSource } from "typeorm";
import { Federation } from "@/entities/Federation";
import { Stadium } from "@/entities/Stadium";
import { Team } from "@/entities/Team";
import { TeamBranding } from "@/entities/TeamBranding";
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
import { Goal } from "@/entities/Goal";
import { Substitution } from "@/entities/Substitution";
import { MatchInjury } from "@/entities/MatchInjury";
import { Trip } from "@/entities/Trip";
import { TripVehicle } from "@/entities/TripVehicle";
import { TripParticipant } from "@/entities/TripParticipant";
import { ClubInfo } from "@/entities/ClubInfo";
import { History } from "@/entities/History";
import { HistoryFigure } from "@/entities/HistoryFigure";
import { Honor } from "@/entities/Honor";
import { AcademyCategory } from "@/entities/AcademyCategory";
import { AcademyInfo } from "@/entities/AcademyInfo";
import { PlayerApplication } from "@/entities/PlayerApplication";
import { RecruitmentNeed } from "@/entities/RecruitmentNeed";
import { RecruitmentApplication } from "@/entities/RecruitmentApplication";
import { Announcement } from "@/entities/Announcement";
import { TeamSocials } from "@/entities/TeamSocials";
import { ContactInfo } from "@/entities/ContactInfo";
import { ContactMessage } from "@/entities/ContactMessage";
import { TicketCategory } from "@/entities/TicketCategory";
import { MatchTicketCategory } from "@/entities/MatchTicketCategory";
import { TicketSaleRule } from "@/entities/TicketSaleRule";
import { ShopOrder } from "@/entities/ShopOrder";
import { ShopOrderItem } from "@/entities/ShopOrderItem";
import { NotificationOutboxEvent } from "@/entities/NotificationOutboxEvent";
import { ProcessedWebhookEvent } from "@/entities/ProcessedWebhookEvent";
import { StockUnavailableRefund } from "@/entities/StockUnavailableRefund";
import { PlayerTransfer } from "@/entities/PlayerTransfer";
import {
  ClubLicenseApplication,
  ClubLicenseDocument,
  ClubLicenseHistory,
  ClubLicenseRequirement,
} from "@/entities/ClubLicense";
import { TeamAffiliation } from "@/entities/TeamAffiliation";
import { PersonLicense, PersonLicenseDocument, PersonLicenseHistory } from "@/entities/PersonLicense";
import { PlayerRegistration, PlayerRegistrationHistory } from "@/entities/PlayerRegistration";
import { PlayerContract, PlayerContractDocument, PlayerContractHistory } from "@/entities/PlayerContract";
import { StaffContract, StaffContractDocument, StaffContractHistory } from "@/entities/StaffContract";
import { ClubSanction, ClubSanctionHistory } from "@/entities/ClubSanction";
import { LegalCase, LegalCaseDocument, LegalCaseHearing, LegalCaseDecision, LegalCaseEvent } from "@/entities/LegalCase";
import { SeasonRegulatoryCycle } from "@/entities/SeasonRegulatoryCycle";
import { FinancialCompliance, FinancialComplianceHistory } from "@/entities/FinancialCompliance";
import { BoardMandate, BoardMember, BoardMandateHistory } from "@/entities/Governance";
import { CoachQualification, CoachQualificationHistory } from "@/entities/CoachQualification";
import { MedicalEligibility, MedicalEligibilityHistory } from "@/entities/MedicalEligibility";
import { FootballAgent, RepresentationAgreement } from "@/entities/Agent";
import { Appeal, AppealDocument, AppealEvent } from "@/entities/Appeal";
import { CompetitionRegistration, CompetitionRegistrationHistory, TransferWindow, TransferWindowHistory } from "@/entities/Regulatory";
import { ClubApprovalDecision, ClubApprovalRequest, ClubGovernanceSettings } from "@/entities/ClubGovernance";
import { Membership, MembershipType } from "@/entities/Membership";
import { PublicFormSettings } from "@/entities/PublicFormSettings";
import { PublicContentPolicy } from "@/entities/PublicContentPolicy";

/**
 * Database connection configuration
 * Uses TypeORM with MariaDB — base "foot" partagée avec ArbiNote et cardManager.
 * Federation/Team/Match sont mappées sur leurs tables existantes (mêmes
 * UUID) ; tout le reste est propre à cette app (préfixe cms_).
 */
let dataSource: DataSource | null = null;
let initPromise: Promise<DataSource> | null = null;

export async function getDataSource(): Promise<DataSource> {
  if (dataSource && dataSource.isInitialized) return dataSource;

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
        Federation, Stadium, Team, TeamBranding, News, Player, TeamMember, Staff,
        MediaItem, MediaGallery, MediaGalleryItem, NewsMedia, MatchGallery, Match,
        User, CardReason, Card, Suspension, Fine, Note, AuditLog, Settings,
        Matchday, Notification, Convocation, ProductCategory, Product, SponsorRequest,
        Sponsor, MatchLineup, Role, UserRole, FriendlyMatch, Training,
        TrainingInvitation, MatchFormation, TacticsBoard, TrainingBlock, PlayerStat,
        Injury, Goal, Substitution, MatchInjury, Trip, TripVehicle, TripParticipant,
        ClubInfo, History, HistoryFigure, Honor, AcademyCategory, AcademyInfo,
        PlayerApplication, RecruitmentNeed, RecruitmentApplication, Announcement,
        TeamSocials, ContactInfo, ContactMessage, TicketCategory, MatchTicketCategory,
        TicketSaleRule, ShopOrder, ShopOrderItem, NotificationOutboxEvent,
        ProcessedWebhookEvent, StockUnavailableRefund, PlayerTransfer, TeamAffiliation,
        ClubLicenseApplication, ClubLicenseRequirement, ClubLicenseDocument,
        ClubLicenseHistory, PersonLicense, PersonLicenseDocument, PersonLicenseHistory,
        PlayerRegistration, PlayerRegistrationHistory, PlayerContract,
        PlayerContractDocument, PlayerContractHistory, StaffContract,
        StaffContractDocument, StaffContractHistory, ClubSanction, ClubSanctionHistory,
        LegalCase, LegalCaseDocument, LegalCaseHearing, LegalCaseDecision, LegalCaseEvent,
        SeasonRegulatoryCycle, FinancialCompliance, FinancialComplianceHistory,
        BoardMandate, BoardMember, BoardMandateHistory, CoachQualification,
        CoachQualificationHistory, MedicalEligibility, MedicalEligibilityHistory,
        FootballAgent, RepresentationAgreement, Appeal, AppealDocument, AppealEvent,
        CompetitionRegistration, CompetitionRegistrationHistory, TransferWindow,
        TransferWindowHistory, ClubGovernanceSettings, ClubApprovalRequest,
        ClubApprovalDecision, Membership, MembershipType, PublicFormSettings,
        PublicContentPolicy,
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

export async function closeDataSource(): Promise<void> {
  if (dataSource && dataSource.isInitialized) {
    await dataSource.destroy();
    dataSource = null;
    initPromise = null;
  }
}

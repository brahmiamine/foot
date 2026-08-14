import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import type { CompetitionRegistrationStatus } from "../../../packages/regulatory-shared/src/competitionRegistration";
import type { TransferWindowStatus, TransferWindowType } from "../../../../packages/regulatory-shared/src/transferWindow";

const ENTRY_STATUSES = ["DRAFT","SUBMITTED","UNDER_REVIEW","CHANGES_REQUESTED","APPROVED","REJECTED","WITHDRAWN","SUSPENDED"] as const;
const WINDOW_TYPES = ["SUMMER","WINTER","SPECIAL","YOUTH","AMATEUR"] as const;
const WINDOW_STATUSES = ["PLANNED","OPEN","CLOSED","SUSPENDED"] as const;

@Entity("competition_registrations")
export class CompetitionRegistration {
  @PrimaryGeneratedColumn("uuid") id!: string;
  @Column({type:"char",length:36,name:"season_id"}) seasonId!: string;
  @Column({type:"char",length:36,name:"club_id"}) clubId!: string;
  @Column({type:"char",length:36,name:"team_id"}) teamId!: string;
  @Column({type:"char",length:36,name:"federation_id"}) federationId!: string;
  @Column({type:"char",length:36,nullable:true,name:"league_id"}) leagueId?: string|null;
  @Column({type:"varchar",length:50}) category!: string;
  @Column({type:"datetime",nullable:true,name:"submitted_at"}) submittedAt?: Date|null;
  @Column({type:"enum",enum:ENTRY_STATUSES,default:"DRAFT"}) status!: CompetitionRegistrationStatus;
  @Column({type:"char",length:36,name:"club_license_id"}) clubLicenseId!: string;
  @Column({type:"char",length:36,nullable:true,name:"stadium_approval_id"}) stadiumApprovalId?: string|null;
  @Column({type:"char",length:36,nullable:true,name:"financial_compliance_id"}) financialComplianceId?: string|null;
  @Column({type:"boolean",default:false,name:"documents_complete"}) documentsComplete!: boolean;
  @Column({type:"decimal",precision:12,scale:3,nullable:true,name:"fees_amount"}) feesAmount?: string|null;
  @Column({type:"varchar",length:191,nullable:true,name:"fees_payment_id"}) feesPaymentId?: string|null;
  @Column({type:"datetime",nullable:true,name:"approved_at"}) approvedAt?: Date|null;
  @Column({type:"varchar",length:191,nullable:true,name:"approved_by"}) approvedBy?: string|null;
  @Column({type:"text",nullable:true,name:"rejection_reason"}) rejectionReason?: string|null;
  @CreateDateColumn({type:"datetime",name:"created_at"}) createdAt!: Date;
  @UpdateDateColumn({type:"datetime",name:"updated_at"}) updatedAt!: Date;
}

@Entity("competition_registration_history")
export class CompetitionRegistrationHistory {
  @PrimaryGeneratedColumn("uuid") id!: string;
  @Column({type:"char",length:36,name:"registration_id"}) registrationId!: string;
  @Column({type:"varchar",length:100}) action!: string;
  @Column({type:"varchar",length:32,nullable:true,name:"from_status"}) fromStatus?: string|null;
  @Column({type:"varchar",length:32,nullable:true,name:"to_status"}) toStatus?: string|null;
  @Column({type:"varchar",length:191,nullable:true,name:"actor_user_id"}) actorUserId?: string|null;
  @Column({type:"varchar",length:50,name:"actor_role"}) actorRole!: string;
  @Column({type:"text",nullable:true}) reason?: string|null;
  @Column({type:"json",nullable:true,name:"before_value"}) beforeValue?: Record<string,unknown>|null;
  @Column({type:"json",nullable:true,name:"after_value"}) afterValue?: Record<string,unknown>|null;
  @Column({type:"varchar",length:45,nullable:true,name:"ip_address"}) ipAddress?: string|null;
  @Column({type:"varchar",length:512,nullable:true,name:"user_agent"}) userAgent?: string|null;
  @CreateDateColumn({type:"datetime",name:"created_at"}) createdAt!: Date;
}

@Entity("transfer_windows")
export class TransferWindow {
  @PrimaryGeneratedColumn("uuid") id!: string;
  @Column({type:"char",length:36,name:"federation_id"}) federationId!: string;
  @Column({type:"char",length:36,nullable:true,name:"league_id"}) leagueId?: string|null;
  @Column({type:"char",length:36,name:"season_id"}) seasonId!: string;
  @Column({type:"enum",enum:WINDOW_TYPES}) type!: TransferWindowType;
  @Column({type:"datetime",name:"opens_at"}) opensAt!: Date;
  @Column({type:"datetime",name:"closes_at"}) closesAt!: Date;
  @Column({type:"enum",enum:WINDOW_STATUSES,default:"PLANNED"}) status!: TransferWindowStatus;
  @Column({type:"text",nullable:true,name:"exception_policy"}) exceptionPolicy?: string|null;
  @Column({type:"varchar",length:191,name:"created_by"}) createdBy!: string;
  @CreateDateColumn({type:"datetime",name:"created_at"}) createdAt!: Date;
  @UpdateDateColumn({type:"datetime",name:"updated_at"}) updatedAt!: Date;
}

@Entity("transfer_window_history")
export class TransferWindowHistory {
  @PrimaryGeneratedColumn("uuid") id!: string;
  @Column({type:"char",length:36,name:"window_id"}) windowId!: string;
  @Column({type:"varchar",length:100}) action!: string;
  @Column({type:"varchar",length:32,nullable:true,name:"from_status"}) fromStatus?: string|null;
  @Column({type:"varchar",length:32,nullable:true,name:"to_status"}) toStatus?: string|null;
  @Column({type:"varchar",length:191,nullable:true,name:"actor_user_id"}) actorUserId?: string|null;
  @Column({type:"varchar",length:50,name:"actor_role"}) actorRole!: string;
  @Column({type:"text",nullable:true}) reason?: string|null;
  @Column({type:"varchar",length:45,nullable:true,name:"ip_address"}) ipAddress?: string|null;
  @Column({type:"varchar",length:512,nullable:true,name:"user_agent"}) userAgent?: string|null;
  @CreateDateColumn({type:"datetime",name:"created_at"}) createdAt!: Date;
}

@Entity("eligibility_checks")
export class EligibilityCheck {
  @PrimaryGeneratedColumn("uuid") id!: string;
  @Column({type:"varchar",length:191,name:"player_id"}) playerId!: string;
  @Column({type:"char",length:36,name:"club_id"}) clubId!: string;
  @Column({type:"char",length:36,name:"match_id"}) matchId!: string;
  @Column({type:"char",length:36,name:"season_id"}) seasonId!: string;
  @Column({type:"boolean"}) eligible!: boolean;
  @Column({type:"json",name:"blocking_reasons"}) blockingReasons!: string[];
  @Column({type:"json"}) warnings!: string[];
  @Column({type:"varchar",length:191,nullable:true,name:"actor_user_id"}) actorUserId?: string|null;
  @Column({type:"varchar",length:50,name:"actor_role"}) actorRole!: string;
  @Column({type:"varchar",length:45,nullable:true,name:"ip_address"}) ipAddress?: string|null;
  @Column({type:"varchar",length:512,nullable:true,name:"user_agent"}) userAgent?: string|null;
  @CreateDateColumn({type:"datetime",name:"checked_at"}) checkedAt!: Date;
}

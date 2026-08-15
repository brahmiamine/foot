import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import type { AppealApplicantType, AppealSourceType, AppealStatus } from "../../../packages/regulatory-shared/src/appeals";

const SOURCE_TYPES = ["LEGAL_CASE", "DISCIPLINARY_CASE", "CLUB_SANCTION", "CLUB_LICENSE", "PERSON_LICENSE", "STADIUM_INSPECTION", "COACH_QUALIFICATION", "FINANCIAL_COMPLIANCE", "MEDICAL_ELIGIBILITY", "OTHER"] as const;
const APPLICANT_TYPES = ["CLUB", "PLAYER", "COACH", "STAFF", "AGENT", "FEDERATION", "OTHER"] as const;
const STATUSES = ["SUBMITTED", "ADMISSIBILITY_REVIEW", "UNDER_REVIEW", "HEARING", "DECIDED", "REJECTED", "WITHDRAWN"] as const;

@Entity("appeals")
export class Appeal {
  @PrimaryGeneratedColumn("uuid") id!: string;
  @Column({ type: "char", length: 36, name: "federation_id" }) federationId!: string;
  @Column({ type: "char", length: 36, nullable: true, name: "league_id" }) leagueId?: string | null;
  @Column({ type: "enum", enum: SOURCE_TYPES, name: "source_type" }) sourceType!: AppealSourceType;
  @Column({ type: "char", length: 36, name: "source_id" }) sourceId!: string;
  @Column({ type: "enum", enum: APPLICANT_TYPES, name: "applicant_type" }) applicantType!: AppealApplicantType;
  @Column({ type: "varchar", length: 191, name: "applicant_id" }) applicantId!: string;
  @Column({ type: "text" }) grounds!: string;
  @Column({ type: "datetime", name: "submitted_at" }) submittedAt!: Date;
  @Column({ type: "enum", enum: STATUSES, default: "SUBMITTED" }) status!: AppealStatus;
  @Column({ type: "datetime", nullable: true, name: "decision_at" }) decisionAt?: Date | null;
  @Column({ type: "text", nullable: true, name: "decision_summary" }) decisionSummary?: string | null;
  @Column({ type: "varchar", length: 191, name: "created_by" }) createdBy!: string;
  @CreateDateColumn({ type: "datetime", name: "created_at" }) createdAt!: Date;
  @UpdateDateColumn({ type: "datetime", name: "updated_at" }) updatedAt!: Date;
}

@Entity("appeal_documents")
export class AppealDocument {
  @PrimaryGeneratedColumn("uuid") id!: string;
  @Column({ type: "char", length: 36, name: "appeal_id" }) appealId!: string;
  @Column({ type: "text", name: "file_url" }) fileUrl!: string;
  @Column({ type: "varchar", length: 255, name: "file_name" }) fileName!: string;
  @Column({ type: "varchar", length: 191, name: "uploaded_by" }) uploadedBy!: string;
  @Column({ type: "datetime", name: "uploaded_at" }) uploadedAt!: Date;
}

@Entity("appeal_events")
export class AppealEvent {
  @PrimaryGeneratedColumn("uuid") id!: string;
  @Column({ type: "char", length: 36, name: "appeal_id" }) appealId!: string;
  @Column({ type: "varchar", length: 100 }) action!: string;
  @Column({ type: "varchar", length: 32, nullable: true, name: "from_status" }) fromStatus?: string | null;
  @Column({ type: "varchar", length: 32, nullable: true, name: "to_status" }) toStatus?: string | null;
  @Column({ type: "varchar", length: 191, nullable: true, name: "actor_user_id" }) actorUserId?: string | null;
  @Column({ type: "varchar", length: 50, name: "actor_role" }) actorRole!: string;
  @Column({ type: "text", nullable: true }) reason?: string | null;
  @Column({ type: "json", nullable: true, name: "after_value" }) afterValue?: Record<string, unknown> | null;
  @Column({ type: "varchar", length: 45, nullable: true, name: "ip_address" }) ipAddress?: string | null;
  @Column({ type: "varchar", length: 512, nullable: true, name: "user_agent" }) userAgent?: string | null;
  @CreateDateColumn({ type: "datetime", name: "created_at" }) createdAt!: Date;
}

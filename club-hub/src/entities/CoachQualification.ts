import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import type { CoachQualificationStatus, CoachQualificationType } from "../../../packages/regulatory-shared/src/coachQualification";

const TYPES = ["CAF_PRO", "CAF_A", "CAF_B", "CAF_C", "NATIONAL", "OTHER"] as const;
const STATUSES = ["PENDING", "VALID", "EXPIRED", "SUSPENDED", "REVOKED"] as const;

@Entity("coach_qualifications")
export class CoachQualification {
  @PrimaryGeneratedColumn("uuid") id!: string;
  @Column({ type: "bigint", name: "staff_id" }) staffId!: string;
  @Column({ type: "char", length: 36, name: "club_id" }) clubId!: string;
  @Column({ type: "char", length: 36, name: "federation_id" }) federationId!: string;
  @Column({ type: "char", length: 36, nullable: true, name: "league_id" }) leagueId?: string | null;
  @Column({ type: "enum", enum: TYPES, name: "qualification_type" }) qualificationType!: CoachQualificationType;
  @Column({ type: "varchar", length: 100, nullable: true, name: "license_number" }) licenseNumber?: string | null;
  @Column({ type: "date", nullable: true, name: "issued_at" }) issuedAt?: string | null;
  @Column({ type: "date", nullable: true, name: "expires_at" }) expiresAt?: string | null;
  @Column({ type: "text", nullable: true, name: "document_url" }) documentUrl?: string | null;
  @Column({ type: "enum", enum: STATUSES, default: "PENDING" }) status!: CoachQualificationStatus;
  @Column({ type: "varchar", length: 191, nullable: true, name: "validated_by" }) validatedBy?: string | null;
  @Column({ type: "datetime", nullable: true, name: "validated_at" }) validatedAt?: Date | null;
  @Column({ type: "text", nullable: true, name: "rejection_reason" }) rejectionReason?: string | null;
  @Column({ type: "varchar", length: 191, name: "created_by" }) createdBy!: string;
  @CreateDateColumn({ type: "datetime", name: "created_at" }) createdAt!: Date;
  @UpdateDateColumn({ type: "datetime", name: "updated_at" }) updatedAt!: Date;
}

@Entity("coach_qualification_history")
export class CoachQualificationHistory {
  @PrimaryGeneratedColumn("uuid") id!: string;
  @Column({ type: "char", length: 36, name: "qualification_id" }) qualificationId!: string;
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

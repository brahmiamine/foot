import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import type { PlayerEligibilityStatus, PlayerRegistrationStatus } from "../../../packages/regulatory-shared/src/playerRegistration";

const STATUSES = ["DRAFT", "SUBMITTED", "APPROVED", "REJECTED", "SUSPENDED", "CANCELLED"] as const;
const ELIGIBILITY = ["ELIGIBLE", "INELIGIBLE", "PENDING"] as const;

@Entity("player_registrations")
export class PlayerRegistration {
  @PrimaryGeneratedColumn("uuid") id!: string;
  @Column({ type: "varchar", length: 191, name: "player_id" }) playerId!: string;
  @Column({ type: "char", length: 36, name: "club_id" }) clubId!: string;
  @Column({ type: "char", length: 36, name: "season_id" }) seasonId!: string;
  @Column({ type: "char", length: 36, name: "federation_id" }) federationId!: string;
  @Column({ type: "char", length: 36, nullable: true, name: "league_id" }) leagueId?: string | null;
  @Column({ type: "char", length: 36, name: "license_id" }) licenseId!: string;
  @Column({ type: "char", length: 36, nullable: true, name: "contract_id" }) contractId?: string | null;
  @Column({ type: "datetime", nullable: true, name: "registered_at" }) registeredAt?: Date | null;
  @Column({ type: "enum", enum: STATUSES, default: "DRAFT" }) status!: PlayerRegistrationStatus;
  @Column({ type: "enum", enum: ELIGIBILITY, default: "PENDING", name: "eligibility_status" }) eligibilityStatus!: PlayerEligibilityStatus;
  @Column({ type: "varchar", length: 191, nullable: true, name: "validated_by" }) validatedBy?: string | null;
  @Column({ type: "datetime", nullable: true, name: "validated_at" }) validatedAt?: Date | null;
  @Column({ type: "text", nullable: true, name: "rejection_reason" }) rejectionReason?: string | null;
  @CreateDateColumn({ type: "datetime", name: "created_at" }) createdAt!: Date;
  @UpdateDateColumn({ type: "datetime", name: "updated_at" }) updatedAt!: Date;
}

@Entity("player_registration_history")
export class PlayerRegistrationHistory {
  @PrimaryGeneratedColumn("uuid") id!: string;
  @Column({ type: "char", length: 36, name: "registration_id" }) registrationId!: string;
  @Column({ type: "varchar", length: 100 }) action!: string;
  @Column({ type: "varchar", length: 32, nullable: true, name: "from_status" }) fromStatus?: string | null;
  @Column({ type: "varchar", length: 32, nullable: true, name: "to_status" }) toStatus?: string | null;
  @Column({ type: "varchar", length: 191, nullable: true, name: "actor_user_id" }) actorUserId?: string | null;
  @Column({ type: "varchar", length: 50, name: "actor_role" }) actorRole!: string;
  @Column({ type: "text", nullable: true }) reason?: string | null;
  @Column({ type: "json", nullable: true, name: "before_value" }) beforeValue?: Record<string, unknown> | null;
  @Column({ type: "json", nullable: true, name: "after_value" }) afterValue?: Record<string, unknown> | null;
  @Column({ type: "varchar", length: 45, nullable: true, name: "ip_address" }) ipAddress?: string | null;
  @Column({ type: "varchar", length: 512, nullable: true, name: "user_agent" }) userAgent?: string | null;
  @CreateDateColumn({ type: "datetime", name: "created_at" }) createdAt!: Date;
}

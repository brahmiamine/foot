import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import type { MemberRegistrationMode } from "@/lib/memberRegistrationPolicy";

export type MemberRegistrationProvider = "PASSWORD" | "GOOGLE" | "INVITATION";
export type MemberRegistrationStatus =
  | "PENDING_EMAIL_VERIFICATION"
  | "PENDING_CLUB_APPROVAL"
  | "INVITED"
  | "COMPLETED"
  | "REJECTED"
  | "EXPIRED";

@Entity("member_registration_requests")
@Index("idx_member_registration_queue", ["teamId", "status", "createdAt"])
export class MemberRegistrationRequest {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "char", length: 36, name: "team_id" })
  teamId!: string;

  @Index()
  @Column({ type: "varchar", length: 191 })
  email!: string;

  @Column({ type: "varchar", length: 191 })
  name!: string;

  @Column({ type: "varchar", length: 100, nullable: true, name: "first_name" })
  firstName!: string | null;

  @Column({ type: "varchar", length: 100, nullable: true, name: "last_name" })
  lastName!: string | null;

  @Column({ type: "varchar", length: 30, nullable: true, name: "phone_number" })
  phoneNumber!: string | null;

  @Column({ type: "varchar", length: 191, nullable: true, name: "password_hash" })
  passwordHash!: string | null;

  @Column({ type: "enum", enum: ["PASSWORD", "GOOGLE", "INVITATION"] })
  provider!: MemberRegistrationProvider;

  @Column({
    type: "enum",
    enum: ["OPEN", "EMAIL_VERIFICATION", "CLUB_APPROVAL", "INVITE_ONLY", "CLOSED"],
    name: "mode_snapshot",
  })
  modeSnapshot!: MemberRegistrationMode;

  @Column({
    type: "enum",
    enum: [
      "PENDING_EMAIL_VERIFICATION",
      "PENDING_CLUB_APPROVAL",
      "INVITED",
      "COMPLETED",
      "REJECTED",
      "EXPIRED",
    ],
  })
  status!: MemberRegistrationStatus;

  @Index({ unique: true })
  @Column({ type: "varchar", length: 191, nullable: true, name: "token_hash" })
  tokenHash!: string | null;

  @Column({ type: "datetime", nullable: true, name: "expires_at" })
  expiresAt!: Date | null;

  @Column({ type: "varchar", length: 191, nullable: true, name: "user_id" })
  userId!: string | null;

  @Column({ type: "varchar", length: 191, nullable: true, name: "reviewed_by_user_id" })
  reviewedByUserId!: string | null;

  @Column({ type: "datetime", nullable: true, name: "reviewed_at" })
  reviewedAt!: Date | null;

  @Column({ type: "text", nullable: true, name: "rejection_reason" })
  rejectionReason!: string | null;

  @CreateDateColumn({ type: "datetime", name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "datetime", name: "updated_at" })
  updatedAt!: Date;
}

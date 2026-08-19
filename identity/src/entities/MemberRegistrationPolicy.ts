import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, Unique } from "typeorm";
import type { MemberRegistrationMode } from "@/lib/memberRegistrationPolicy";

export const MEMBER_REGISTRATION_MODES: MemberRegistrationMode[] = [
  "OPEN",
  "EMAIL_VERIFICATION",
  "CLUB_APPROVAL",
  "INVITE_ONLY",
  "CLOSED",
];

@Entity("member_registration_policies")
@Unique("uq_member_registration_policy_version", ["teamId", "version"])
@Index("idx_member_registration_policy_resolution", ["teamId", "effectiveFrom", "effectiveUntil", "version"])
export class MemberRegistrationPolicy {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "char", length: 36, name: "team_id" })
  teamId!: string;

  @Column({ type: "enum", enum: MEMBER_REGISTRATION_MODES, default: "OPEN" })
  mode!: MemberRegistrationMode;

  @Column({ type: "int", default: 1 })
  version!: number;

  @Column({ type: "datetime", nullable: true, name: "effective_from" })
  effectiveFrom!: Date | null;

  @Column({ type: "datetime", nullable: true, name: "effective_until" })
  effectiveUntil!: Date | null;

  @Column({ type: "varchar", length: 191, nullable: true, name: "updated_by" })
  updatedBy!: string | null;

  @CreateDateColumn({ type: "datetime", name: "created_at" })
  createdAt!: Date;
}

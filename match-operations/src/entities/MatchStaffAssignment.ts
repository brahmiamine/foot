import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

export type MatchStaffRole = "HEAD_COACH" | "ASSISTANT_COACH" | "MEDICAL" | "STAFF";

@Entity("ms_match_staff_assignments")
export class MatchStaffAssignment {
  @PrimaryGeneratedColumn("uuid") id!: string;
  @Column({ type: "char", length: 36, name: "match_id" }) matchId!: string;
  @Column({ type: "char", length: 36, name: "team_id" }) teamId!: string;
  @Column({ type: "bigint", name: "staff_id" }) staffId!: string;
  @Column({ type: "enum", enum: ["HEAD_COACH", "ASSISTANT_COACH", "MEDICAL", "STAFF"] }) role!: MatchStaffRole;
  @Column({ type: "varchar", length: 191, nullable: true, name: "assigned_by" }) assignedBy?: string | null;
  @CreateDateColumn({ type: "datetime", name: "created_at" }) createdAt!: Date;
  @UpdateDateColumn({ type: "datetime", name: "updated_at" }) updatedAt!: Date;
}

@Entity("cms_staff")
export class MatchStaffRead {
  @Column({ primary: true, type: "bigint" }) id!: string;
  @Column({ type: "char", length: 36, name: "team_id" }) teamId!: string;
  @Column({ type: "varchar", length: 30, name: "staff_type" }) staffType!: string;
}

@Entity("coach_qualifications")
export class CoachQualificationRead {
  @Column({ primary: true, type: "char", length: 36 }) id!: string;
  @Column({ type: "bigint", name: "staff_id" }) staffId!: string;
  @Column({ type: "char", length: 36, name: "club_id" }) clubId!: string;
  @Column({ type: "varchar", length: 32, name: "qualification_type" }) qualificationType!: "CAF_PRO"|"CAF_A"|"CAF_B"|"CAF_C"|"NATIONAL"|"OTHER";
  @Column({ type: "varchar", length: 32 }) status!: string;
  @Column({ type: "date", nullable: true, name: "expires_at" }) expiresAt?: string | null;
}

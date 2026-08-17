import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from "typeorm";

export type InjuryClearanceDecision = "CLEAR" | "NOT_CLEAR";

@Entity("cms_injury_clearances")
@Index(["teamId", "injuryId", "createdAt"])
export class InjuryClearance {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "bigint", name: "injury_id" })
  injuryId!: number;

  @Column({ type: "char", length: 36, name: "team_id" })
  teamId!: string;

  @Column({ type: "varchar", length: 191, name: "reviewer_user_id" })
  reviewerUserId!: string;

  @Column({ type: "enum", enum: ["CLEAR", "NOT_CLEAR"] })
  decision!: InjuryClearanceDecision;

  @Column({ type: "text", nullable: true })
  notes?: string | null;

  @CreateDateColumn({ type: "datetime", name: "created_at" })
  createdAt!: Date;
}

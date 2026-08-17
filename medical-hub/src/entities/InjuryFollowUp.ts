import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from "typeorm";

export type InjuryFollowUpType = "NOTE" | "RTP_TRANSITION" | "CLEARANCE_DECISION";

@Entity("cms_injury_followups")
@Index(["teamId", "injuryId", "createdAt"])
export class InjuryFollowUp {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "bigint", name: "injury_id" })
  injuryId!: number;

  @Column({ type: "char", length: 36, name: "team_id" })
  teamId!: string;

  @Column({ type: "varchar", length: 191, name: "author_user_id" })
  authorUserId!: string;

  @Column({
    type: "enum",
    enum: ["NOTE", "RTP_TRANSITION", "CLEARANCE_DECISION"],
    default: "NOTE",
    name: "entry_type",
  })
  entryType!: InjuryFollowUpType;

  @Column({ type: "text" })
  note!: string;

  @Column({ type: "simple-json", nullable: true, name: "metadata_json" })
  metadata?: Record<string, unknown> | null;

  @CreateDateColumn({ type: "datetime", name: "created_at" })
  createdAt!: Date;
}

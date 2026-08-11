import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from "typeorm";

export type ObModerationAction =
  | "HIDE_POST"
  | "HIDE_COMMENT"
  | "BLOCK_USER"
  | "UNBLOCK_USER"
  | "APPROVE_FAN_WALL"
  | "REJECT_FAN_WALL"
  | "RESOLVE_REPORT"
  | "DISMISS_REPORT";

@Entity("ob_moderation_log")
export class ObModerationLog {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "varchar", length: 191, name: "actor_user_id" })
  actorUserId!: string;

  @Column({ type: "enum", enum: [
    "HIDE_POST",
    "HIDE_COMMENT",
    "BLOCK_USER",
    "UNBLOCK_USER",
    "APPROVE_FAN_WALL",
    "REJECT_FAN_WALL",
    "RESOLVE_REPORT",
    "DISMISS_REPORT",
  ] })
  action!: ObModerationAction;

  @Column({ type: "varchar", length: 32, name: "target_type" })
  targetType!: string;

  @Column({ type: "varchar", length: 191, name: "target_id" })
  targetId!: string;

  @Column({ type: "varchar", length: 500, nullable: true })
  reason?: string | null;

  @CreateDateColumn({ type: "datetime", name: "created_at" })
  createdAt!: Date;
}

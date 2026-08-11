import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from "typeorm";

export type ObReactionTargetType = "POST" | "NEWS" | "COMMENT";
export const REACTION_EMOJIS = ["❤️", "🔥", "👏"] as const;
export type ObReactionEmoji = (typeof REACTION_EMOJIS)[number];

@Entity("ob_reactions")
export class ObReaction {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "enum", enum: ["POST", "NEWS", "COMMENT"], name: "target_type" })
  targetType!: ObReactionTargetType;

  @Column({ type: "varchar", length: 191, name: "target_id" })
  targetId!: string;

  @Column({ type: "varchar", length: 191, name: "user_id" })
  userId!: string;

  @Column({ type: "varchar", length: 8 })
  emoji!: string;

  @CreateDateColumn({ type: "datetime", name: "created_at" })
  createdAt!: Date;
}

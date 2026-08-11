import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from "typeorm";

export type ObCommentTargetType = "POST" | "NEWS";

@Entity("ob_comments")
export class ObComment {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "enum", enum: ["POST", "NEWS"], name: "target_type" })
  targetType!: ObCommentTargetType;

  @Column({ type: "varchar", length: 191, name: "target_id" })
  targetId!: string;

  @Column({ type: "varchar", length: 191, name: "user_id" })
  userId!: string;

  @Column({ type: "varchar", length: 1000 })
  body!: string;

  @Column({ type: "enum", enum: ["PUBLISHED", "HIDDEN"], default: "PUBLISHED" })
  status!: "PUBLISHED" | "HIDDEN";

  @CreateDateColumn({ type: "datetime", name: "created_at" })
  createdAt!: Date;
}

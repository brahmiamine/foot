import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from "typeorm";

@Entity("ob_follows")
export class ObFollow {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id!: number;

  @Column({ type: "varchar", length: 191, name: "user_id" })
  userId!: string;

  @Column({ type: "enum", enum: ["TEAM", "PLAYER"], name: "target_type" })
  targetType!: "TEAM" | "PLAYER";

  @Column({ type: "varchar", length: 191, name: "target_id" })
  targetId!: string;

  @CreateDateColumn({ type: "datetime", name: "created_at" })
  createdAt!: Date;
}

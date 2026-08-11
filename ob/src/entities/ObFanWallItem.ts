import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from "typeorm";

@Entity("ob_fan_wall_items")
export class ObFanWallItem {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "varchar", length: 191, name: "user_id" })
  userId!: string;

  @Column({ type: "varchar", length: 500, nullable: true })
  message?: string | null;

  @Column({ type: "text", nullable: true, name: "image_url" })
  imageUrl?: string | null;

  @Column({ type: "text", nullable: true, name: "video_url" })
  videoUrl?: string | null;

  @Column({ type: "enum", enum: ["PENDING", "PUBLISHED", "REJECTED"], default: "PENDING" })
  status!: "PENDING" | "PUBLISHED" | "REJECTED";

  @Column({ type: "varchar", length: 191, nullable: true, name: "reviewed_by" })
  reviewedBy?: string | null;

  @Column({ type: "datetime", nullable: true, name: "reviewed_at" })
  reviewedAt?: Date | null;

  @CreateDateColumn({ type: "datetime", name: "created_at" })
  createdAt!: Date;
}

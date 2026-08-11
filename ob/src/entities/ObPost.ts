import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from "typeorm";

@Entity("ob_posts")
export class ObPost {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "varchar", length: 191, name: "user_id" })
  userId!: string;

  @Column({ type: "text" })
  body!: string;

  @Column({ type: "text", nullable: true, name: "image_url" })
  imageUrl?: string | null;

  @Column({ type: "enum", enum: ["PUBLISHED", "HIDDEN"], default: "PUBLISHED" })
  status!: "PUBLISHED" | "HIDDEN";

  @CreateDateColumn({ type: "datetime", name: "created_at" })
  createdAt!: Date;
}

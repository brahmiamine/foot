import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from "typeorm";

@Entity("ob_stadium_checkins")
export class ObStadiumCheckin {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "varchar", length: 191, name: "user_id" })
  userId!: string;

  @Column({ type: "char", length: 36, name: "match_id", collation: "utf8mb4_uca1400_ai_ci" })
  matchId!: string;

  @CreateDateColumn({ type: "datetime", name: "created_at" })
  createdAt!: Date;
}

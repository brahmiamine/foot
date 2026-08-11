import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from "typeorm";

@Entity("ob_quizzes")
export class ObQuiz {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "varchar", length: 255 })
  question!: string;

  @Column({ type: "enum", enum: ["OPEN", "CLOSED"], default: "OPEN" })
  status!: "OPEN" | "CLOSED";

  @Column({ type: "varchar", length: 191, nullable: true, name: "created_by" })
  createdBy?: string | null;

  @CreateDateColumn({ type: "datetime", name: "created_at" })
  createdAt!: Date;
}

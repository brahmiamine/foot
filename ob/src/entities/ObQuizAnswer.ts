import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from "typeorm";

@Entity("ob_quiz_answers")
export class ObQuizAnswer {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "int", name: "quiz_id" })
  quizId!: number;

  @Column({ type: "int", name: "option_id" })
  optionId!: number;

  @Column({ type: "varchar", length: 191, name: "user_id" })
  userId!: string;

  @Column({ type: "tinyint", default: 0, name: "is_correct" })
  isCorrect!: boolean;

  @CreateDateColumn({ type: "datetime", name: "created_at" })
  createdAt!: Date;
}

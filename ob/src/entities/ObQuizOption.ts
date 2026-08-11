import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";

@Entity("ob_quiz_options")
export class ObQuizOption {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "int", name: "quiz_id" })
  quizId!: number;

  @Column({ type: "varchar", length: 191 })
  label!: string;

  @Column({ type: "tinyint", default: 0, name: "is_correct" })
  isCorrect!: boolean;

  @Column({ type: "int", default: 0, name: "sort_order" })
  sortOrder!: number;
}

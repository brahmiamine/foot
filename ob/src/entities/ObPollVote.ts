import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from "typeorm";

@Entity("ob_poll_votes")
export class ObPollVote {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id!: number;

  @Column({ type: "bigint", name: "poll_id" })
  pollId!: number;

  @Column({ type: "bigint", name: "option_id" })
  optionId!: number;

  @Column({ type: "varchar", length: 191, name: "user_id" })
  userId!: string;

  @CreateDateColumn({ type: "datetime", name: "created_at" })
  createdAt!: Date;
}

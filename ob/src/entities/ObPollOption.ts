import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";

@Entity("ob_poll_options")
export class ObPollOption {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id!: number;

  @Column({ type: "bigint", name: "poll_id" })
  pollId!: number;

  @Column({ type: "varchar", length: 191 })
  label!: string;

  @Column({ type: "varchar", length: 191, nullable: true, name: "player_id" })
  playerId?: string | null;

  @Column({ type: "int", default: 0, name: "sort_order" })
  sortOrder!: number;
}

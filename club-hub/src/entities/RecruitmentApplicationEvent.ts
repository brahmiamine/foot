import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { RecruitmentApplication } from "./RecruitmentApplication";
import { Team } from "./Team";

@Entity("cms_recruitment_application_events")
export class RecruitmentApplicationEvent {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id!: number;

  @Column({ type: "char", length: 36, name: "team_id" })
  teamId!: string;

  @ManyToOne(() => Team, { onDelete: "CASCADE" })
  @JoinColumn({ name: "team_id" })
  team!: Team;

  @Column({ type: "bigint", name: "application_id" })
  applicationId!: number;

  @ManyToOne(() => RecruitmentApplication, { onDelete: "CASCADE" })
  @JoinColumn({ name: "application_id" })
  application!: RecruitmentApplication;

  @Column({ type: "varchar", length: 191, name: "actor_id" })
  actorId!: string;

  @Column({ type: "varchar", length: 64 })
  transition!: string;

  @Column({ type: "varchar", length: 64, name: "from_status" })
  fromStatus!: string;

  @Column({ type: "varchar", length: 64, name: "to_status" })
  toStatus!: string;

  @Column({ type: "longtext", nullable: true })
  details?: string | null;

  @CreateDateColumn({ type: "datetime", name: "created_at" })
  createdAt!: Date;
}

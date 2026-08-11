import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from "typeorm";

@Entity("ob_member_badges")
export class ObMemberBadge {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "varchar", length: 191, name: "user_id" })
  userId!: string;

  @Column({ type: "varchar", length: 64, name: "badge_id" })
  badgeId!: string;

  @CreateDateColumn({ type: "datetime", name: "awarded_at" })
  awardedAt!: Date;
}

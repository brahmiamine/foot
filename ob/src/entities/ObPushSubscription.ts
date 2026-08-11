import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from "typeorm";

@Entity("ob_push_subscriptions")
export class ObPushSubscription {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "varchar", length: 191, name: "user_id" })
  userId!: string;

  @Column({ type: "varchar", length: 500 })
  endpoint!: string;

  @Column({ type: "varchar", length: 255 })
  p256dh!: string;

  @Column({ type: "varchar", length: 255 })
  auth!: string;

  @CreateDateColumn({ type: "datetime", name: "created_at" })
  createdAt!: Date;
}

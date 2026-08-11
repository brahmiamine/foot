import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from "typeorm";

@Entity("ob_newsletter_subscribers")
export class ObNewsletterSubscriber {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "varchar", length: 255 })
  email!: string;

  @Column({ type: "varchar", length: 191, nullable: true, name: "user_id" })
  userId?: string | null;

  @Column({ type: "varchar", length: 64, name: "unsubscribe_token" })
  unsubscribeToken!: string;

  @CreateDateColumn({ type: "datetime", name: "subscribed_at" })
  subscribedAt!: Date;

  @Column({ type: "datetime", nullable: true, name: "unsubscribed_at" })
  unsubscribedAt?: Date | null;
}

import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('refund_manual_review_policies')
export class RefundManualReviewPolicy {
  @PrimaryColumn({ type: 'varchar', length: 100 })
  consumerApplication: string;

  @Column({ type: 'int', default: 1440 })
  slaMinutes: number;

  @Column({ type: 'int', default: 240 })
  reminderBeforeDueMinutes: number;

  @Column({ type: 'int', default: 60 })
  escalationAfterDueMinutes: number;

  @Column({ type: 'int', default: 1 })
  version: number;

  @Column({ type: 'varchar', length: 100 })
  updatedByApplication: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  updatedByUser: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('refund_approval_policies')
export class RefundApprovalPolicy {
  @PrimaryColumn({ type: 'varchar', length: 100 })
  consumerApplication: string;

  @Column({ type: 'decimal', precision: 12, scale: 3, nullable: true })
  autoMaxAmount: string | null;

  @Column({ type: 'decimal', precision: 12, scale: 3, nullable: true })
  dualApprovalMinAmount: string | null;

  @Column({ type: 'tinyint', default: 1 })
  makerCheckerEnabled: boolean;

  @Column({ type: 'int', default: 1 })
  version: number;

  @Column({ type: 'varchar', length: 100 })
  updatedByApplication: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

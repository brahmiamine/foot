import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity('sp_marketplace_club_settings')
export class MarketplaceClubSettings {
  @PrimaryColumn({ type: 'varchar', length: 36 }) clubId: string;
  @Column({ type: 'boolean', default: true }) sellerApplicationsEnabled: boolean;
  @Column({ type: 'boolean', default: true }) sellerApprovalRequired: boolean;
  @Column({ type: 'boolean', default: true }) productApprovalRequired: boolean;
  @Column({ type: 'boolean', default: true }) productReapprovalOnSensitiveChange: boolean;
  @Column({ type: 'varchar', length: 191, nullable: true }) updatedBy: string | null;
  @CreateDateColumn({ type: 'datetime', precision: 6 }) createdAt: Date;
  @UpdateDateColumn({ type: 'datetime', precision: 6 }) updatedAt: Date;
}

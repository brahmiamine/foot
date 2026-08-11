import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm";

/**
 * TicketCategory Entity — catalogue réutilisable de catégories de billets
 * (Gradin, Chaise, VIP...), propre au club. Dynamique : jamais codé en dur,
 * voir cms_ticketing_event_categories pour l'association à un match précis.
 */
@Entity("cms_ticket_categories")
export class TicketCategory {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "char", length: 36, name: "team_id" })
  teamId!: string;

  @Column({ type: "varchar", length: 100 })
  name!: string;

  @Column({ type: "varchar", length: 100, nullable: true, name: "name_ar" })
  nameAr?: string | null;

  @Column({ type: "varchar", length: 500, nullable: true })
  description?: string | null;

  @Column({ type: "decimal", precision: 10, scale: 3, default: 0 })
  price!: string;

  @Column({ type: "varchar", length: 7, nullable: true })
  color?: string | null;

  @Column({ type: "tinyint", default: 1, name: "is_active" })
  isActive!: boolean;

  @Column({ type: "int", default: 0, name: "display_order" })
  displayOrder!: number;

  @CreateDateColumn({ type: "datetime", name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "datetime", nullable: true, name: "updated_at" })
  updatedAt?: Date | null;
}

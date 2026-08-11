import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";

/** Mappée sur `cms_ticket_categories` (config gérée par teamManager). Lecture seule ici. */
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
}

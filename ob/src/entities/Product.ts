import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";

/** Mappée sur `cms_products` (table teamManager), scopée par team_id. Lecture seule. */
@Entity("cms_products")
export class Product {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id!: number;

  @Column({ type: "char", length: 36, name: "team_id" })
  teamId!: string;

  @Column({ type: "varchar", length: 200, name: "name_fr" })
  nameFr!: string;
  @Column({ type: "varchar", length: 200, nullable: true, name: "name_ar" })
  nameAr?: string | null;

  @Column({ type: "decimal", precision: 10, scale: 3, default: 0 })
  price!: string;

  @Column({ type: "int", default: 0 })
  stock!: number;

  @Column({ type: "varchar", length: 255, nullable: true, name: "image_url" })
  imageUrl?: string | null;

  @Column({ type: "tinyint", default: 1, name: "is_active" })
  isActive!: boolean;
}

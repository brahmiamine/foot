import "reflect-metadata";
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { SellerStatus } from "./enums";
import type { SellerUser } from "./SellerUser";
import type { Product } from "./Product";

/**
 * Le vendeur tiers. Toute donnée de l'app (produits, commandes, stock,
 * finances) est scopée par sellerId — voir src/lib/authz.ts pour la règle
 * d'isolation appliquée côté API.
 */
@Entity({ name: "sp_sellers" })
export class Seller {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 191 })
  businessName!: string;

  @Column({ type: "varchar", length: 191 })
  ownerName!: string;

  @Index({ unique: true })
  @Column({ type: "varchar", length: 191 })
  email!: string;

  @Column({ type: "varchar", length: 32, nullable: true })
  phone!: string | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  address!: string | null;

  @Column({ type: "varchar", length: 120, nullable: true })
  city!: string | null;

  @Column({ type: "varchar", length: 120, nullable: true })
  country!: string | null;

  @Column({ type: "text", nullable: true })
  description!: string | null;

  @Column({ type: "varchar", length: 120, nullable: true })
  activityCategory!: string | null;

  @Column({ type: "varchar", length: 120, nullable: true })
  taxId!: string | null;

  @Column({ type: "varchar", length: 120, nullable: true })
  tradeRegister!: string | null;

  @Column({ type: "varchar", length: 500, nullable: true })
  logoUrl!: string | null;

  // Documents justificatifs (registre de commerce, pièce d'identité, etc.)
  // — liste de chemins/URLs, volontairement libre pour rester extensible
  // sans migration à chaque nouveau type de document exigé par l'OB.
  @Column({ type: "json", nullable: true })
  documents!: { label: string; url: string }[] | null;

  @Column({ type: "enum", enum: SellerStatus, default: SellerStatus.PENDING })
  status!: SellerStatus;

  @Column({ type: "text", nullable: true })
  statusReason!: string | null;

  // Taux de commission par défaut appliqué à ce vendeur, défini par l'OB
  // uniquement (jamais modifiable depuis le Seller Portal). Pourcentage,
  // ex: 10.00 = 10%.
  @Column({ type: "decimal", precision: 5, scale: 2, default: 10 })
  commissionRate!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @OneToMany("SellerUser", (u: SellerUser) => u.seller)
  users!: SellerUser[];

  @OneToMany("Product", (p: Product) => p.seller)
  products!: Product[];
}

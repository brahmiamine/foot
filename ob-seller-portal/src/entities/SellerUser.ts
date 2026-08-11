import "reflect-metadata";
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { SellerUserRole, SellerUserStatus } from "./enums";
import { Seller } from "./Seller";

/**
 * Utilisateur pouvant se connecter au Seller Portal. En V1 un seul compte
 * OWNER par vendeur suffit, mais le modèle supporte déjà plusieurs comptes
 * (MANAGER, STAFF) par vendeur pour une évolution future sans migration.
 */
@Entity({ name: "sp_seller_users" })
export class SellerUser {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 191 })
  sellerId!: string;

  @ManyToOne("Seller", (s: Seller) => s.users, { onDelete: "CASCADE" })
  @JoinColumn({ name: "sellerId" })
  seller!: Seller;

  @Column({ type: "varchar", length: 191 })
  name!: string;

  @Index({ unique: true })
  @Column({ type: "varchar", length: 191 })
  email!: string;

  @Column({ type: "varchar", length: 255 })
  passwordHash!: string;

  @Column({ type: "enum", enum: SellerUserRole, default: SellerUserRole.OWNER })
  role!: SellerUserRole;

  @Column({ type: "enum", enum: SellerUserStatus, default: SellerUserStatus.ACTIVE })
  status!: SellerUserStatus;

  @Column({ type: "datetime", nullable: true })
  emailVerifiedAt!: Date | null;

  @Column({ type: "varchar", length: 191, nullable: true })
  passwordResetTokenHash!: string | null;

  @Column({ type: "datetime", nullable: true })
  passwordResetExpiresAt!: Date | null;

  @Column({ type: "datetime", nullable: true })
  lastLoginAt!: Date | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}

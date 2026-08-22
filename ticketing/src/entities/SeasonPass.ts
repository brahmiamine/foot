import "reflect-metadata";
import { Column, CreateDateColumn, Entity, PrimaryColumn } from "typeorm";

export type SeasonPassStatus = "ACTIVE" | "EXPIRED" | "CANCELLED";

/**
 * TICK-007 (P2) — abonnement saison : entitlement à retirer un billet
 * gratuitement pour n'importe quel match de la catégorie couverte, tant
 * que le pass est ACTIVE et dans sa fenêtre `[startsAt, expiresAt)`. Un
 * renouvellement crée une NOUVELLE ligne liée par `renewedFromId`, jamais
 * une prolongation en place — même logique de non-rétroactivité que les
 * autres entités versionnées de la roadmap.
 */
@Entity({ name: "tk_season_passes" })
export class SeasonPass {
  @PrimaryColumn({ type: "char", length: 36 })
  id!: string;

  @Column({ type: "char", length: 36, name: "club_id" })
  clubId!: string;

  @Column({ type: "char", length: 36, name: "category_id" })
  categoryId!: string;

  @Column({ type: "varchar", length: 191, name: "purchaser_id" })
  purchaserId!: string;

  @Column({ type: "enum", enum: ["ACTIVE", "EXPIRED", "CANCELLED"], default: "ACTIVE" })
  status!: SeasonPassStatus;

  @Column({ type: "datetime", name: "starts_at" })
  startsAt!: Date;

  @Column({ type: "datetime", name: "expires_at" })
  expiresAt!: Date;

  @Column({ type: "char", length: 36, nullable: true, name: "renewed_from_id" })
  renewedFromId!: string | null;

  @Column({ type: "decimal", precision: 10, scale: 3 })
  price!: string;

  @Column({ type: "varchar", length: 36, nullable: true, name: "payment_id" })
  paymentId!: string | null;

  @CreateDateColumn({ type: "datetime", name: "created_at" })
  createdAt!: Date;
}

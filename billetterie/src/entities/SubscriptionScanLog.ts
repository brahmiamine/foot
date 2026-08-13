import "reflect-metadata";
import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from "typeorm";

/**
 * Journal d'entrée du scanner de contrôle d'accès pour les abonnements —
 * même rôle que TicketScanLog, mais un abonnement peut accumuler de
 * nombreuses lignes SUCCESS au fil de la saison (un billet n'en a jamais
 * qu'une seule, voir scanTicket). `subscriptionId` est NULL quand le jeton
 * scanné n'est même pas une signature valide.
 */
@Entity({ name: "tk_subscription_scans" })
export class SubscriptionScanLog {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index()
  @Column({ type: "char", length: 36, name: "subscription_id", nullable: true })
  subscriptionId!: string | null;

  @Column({
    type: "enum",
    enum: ["SUCCESS", "ALREADY_VALIDATED_TODAY", "NOT_PAID", "NOT_YET_VALID", "EXPIRED", "REVOKED", "INVALID"],
  })
  result!: "SUCCESS" | "ALREADY_VALIDATED_TODAY" | "NOT_PAID" | "NOT_YET_VALID" | "EXPIRED" | "REVOKED" | "INVALID";

  // User.id (sso, rôle ADMIN/SUPERADMIN) du membre du staff qui a scanné.
  @Column({ type: "varchar", length: 191, name: "scanned_by" })
  scannedBy!: string;

  @Column({ type: "varchar", length: 64, name: "terminal_id", nullable: true })
  terminalId!: string | null;

  @CreateDateColumn({ type: "datetime", name: "scanned_at" })
  scannedAt!: Date;
}

import "reflect-metadata";
import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from "typeorm";

/**
 * Journal d'entrée du scanner de contrôle d'accès (voir src/lib/tickets.ts,
 * scanTicket) — une ligne par tentative de scan, réussie ou non. `ticketId`
 * est NULL quand le jeton scanné n'est même pas une signature valide
 * (jamais résolu à un billet) : ces lignes restent utiles pour repérer un
 * pattern d'abus (jeton fabriqué, capture d'écran d'un ancien billet).
 */
@Entity({ name: "tk_ticket_scans" })
export class TicketScanLog {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index()
  @Column({ type: "char", length: 36, name: "ticket_id", nullable: true })
  ticketId!: string | null;

  @Column({
    type: "enum",
    enum: ["SUCCESS", "ALREADY_USED", "NOT_PAID", "MATCH_CANCELLED", "INVALID", "REVOKED"],
  })
  result!: "SUCCESS" | "ALREADY_USED" | "NOT_PAID" | "MATCH_CANCELLED" | "INVALID" | "REVOKED";

  // User.id (sso, rôle ADMIN/SUPERADMIN) du membre du staff qui a scanné.
  @Column({ type: "varchar", length: 191, name: "scanned_by" })
  scannedBy!: string;

  @CreateDateColumn({ type: "datetime", name: "scanned_at" })
  scannedAt!: Date;
}

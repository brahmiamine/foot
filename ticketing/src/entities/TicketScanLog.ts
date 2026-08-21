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
    enum: ["SUCCESS", "ALREADY_USED", "NOT_PAID", "MATCH_CANCELLED", "INVALID", "REVOKED", "GATE_CLOSED"],
  })
  result!: "SUCCESS" | "ALREADY_USED" | "NOT_PAID" | "MATCH_CANCELLED" | "INVALID" | "REVOKED" | "GATE_CLOSED";

  // User.id (sso, rôle ADMIN/SUPERADMIN) du membre du staff qui a scanné.
  @Column({ type: "varchar", length: 191, name: "scanned_by" })
  scannedBy!: string;

  /**
   * Identifiant d'appareil (TASK-P0-008), généré et persisté côté client
   * (voir src/lib/offlineScan.ts, getOrCreateTerminalId) — distingue deux
   * terminaux utilisés par le même admin/staff. NULL pour un scan en ligne
   * sans contexte multi-terminal (route /api/admin/tickets/scan appelée
   * directement) — seule la synchro batch (/sync-scans) le renseigne
   * systématiquement.
   */
  @Column({ type: "varchar", length: 64, name: "terminal_id", nullable: true })
  terminalId!: string | null;

  @CreateDateColumn({ type: "datetime", name: "scanned_at" })
  scannedAt!: Date;
}

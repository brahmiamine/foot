import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from "typeorm";

export type TicketScanResult = "VALID" | "ALREADY_USED" | "CANCELLED" | "INVALID" | "WRONG_EVENT" | "EXPIRED";

@Entity("cms_ticket_scans")
export class TicketScan {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "char", length: 36, name: "team_id" })
  teamId!: string;

  @Column({ type: "int", name: "ticket_id" })
  ticketId!: number;

  @Column({ type: "varchar", length: 191, name: "controller_user_id" })
  controllerUserId!: string;

  @Column({ type: "varchar", length: 50, nullable: true })
  gate?: string | null;

  @Column({ type: "enum", enum: ["VALID", "ALREADY_USED", "CANCELLED", "INVALID", "WRONG_EVENT", "EXPIRED"] })
  result!: TicketScanResult;

  @Column({ type: "varchar", length: 100, nullable: true, name: "device_id" })
  deviceId?: string | null;

  @CreateDateColumn({ type: "datetime", name: "scanned_at" })
  scannedAt!: Date;
}

import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from "typeorm";
import { Sheet } from "./Sheet";
import { SignaturePhase, ActorRole } from "./Signature";

/**
 * Reservation Entity — réserve (réclamation formelle) consignée sur la
 * feuille par une équipe ou l'arbitre, avant ou après le match.
 */
@Entity("ms_reservations")
export class Reservation {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id!: number;

  @Column({ type: "bigint", name: "sheet_id" })
  sheetId!: number;

  @ManyToOne(() => Sheet, { onDelete: "CASCADE" })
  @JoinColumn({ name: "sheet_id" })
  sheet!: Sheet;

  @Column({ type: "enum", enum: ["PRE_MATCH", "POST_MATCH"] })
  phase!: SignaturePhase;

  @Column({ type: "enum", enum: ["TEAM_HOME", "TEAM_AWAY", "REFEREE"], name: "author_role" })
  authorRole!: ActorRole;

  @Column({ type: "text" })
  content!: string;

  @CreateDateColumn({ type: "datetime", name: "created_at" })
  createdAt!: Date;
}

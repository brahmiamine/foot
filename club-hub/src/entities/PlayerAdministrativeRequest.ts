import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from "typeorm";

export type PlayerAdministrativeRequestType = "ATTESTATION" | "DOCUMENT" | "APPOINTMENT";
export type PlayerAdministrativeRequestStatus = "NEW" | "IN_PROGRESS" | "FULFILLED" | "REJECTED";

/**
 * PLAYER-005 (P2) — `cms_player_administrative_requests`. Le joueur crée sa
 * propre demande depuis player-hub (voir player-hub/src/entities/
 * PlayerAdministrativeRequest.ts) ; club-hub la fait avancer avec suivi
 * (statut/note/résolution) depuis son écran admin.
 */
@Entity("cms_player_administrative_requests")
export class PlayerAdministrativeRequest {
  @PrimaryColumn({ type: "char", length: 36 })
  id!: string;

  @Column({ type: "char", length: 36, name: "team_id" })
  teamId!: string;

  @Column({ type: "varchar", length: 191, name: "player_id" })
  playerId!: string;

  @Column({ type: "varchar", length: 191, name: "requester_user_id" })
  requesterUserId!: string;

  @Column({ type: "enum", enum: ["ATTESTATION", "DOCUMENT", "APPOINTMENT"], name: "request_type" })
  requestType!: PlayerAdministrativeRequestType;

  @Column({ type: "text" })
  details!: string;

  @Column({ type: "enum", enum: ["NEW", "IN_PROGRESS", "FULFILLED", "REJECTED"], default: "NEW" })
  status!: PlayerAdministrativeRequestStatus;

  @Column({ type: "varchar", length: 191, nullable: true, name: "staff_user_id" })
  staffUserId?: string | null;

  @Column({ type: "text", nullable: true, name: "staff_note" })
  staffNote?: string | null;

  @Column({ type: "datetime", nullable: true, name: "resolved_at" })
  resolvedAt?: Date | null;

  @CreateDateColumn({ type: "datetime", name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "datetime", name: "updated_at" })
  updatedAt!: Date;
}

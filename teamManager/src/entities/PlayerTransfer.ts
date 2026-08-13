import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from "typeorm";
import { Player } from "./Player";
import { Team } from "./Team";

export type PlayerTransferType = "PERMANENT" | "LOAN" | "LOAN_RETURN" | "FREE_TRANSFER";
export type PlayerTransferStatus = "DRAFT" | "PENDING" | "APPROVED" | "COMPLETED" | "CANCELLED" | "REJECTED";

/**
 * migration.md §19-21 : module central de transfert/homologation. Table
 * propre à `teamManager`, qui possède déjà `Player` et `TeamMember`
 * (`cms_team_members`) — un transfert `COMPLETED` doit clôturer l'ancienne
 * affiliation `TeamMember`, en créer une nouvelle et mettre à jour
 * `Player.teamId` dans UNE SEULE transaction DB (§20) : ce n'est possible
 * de façon atomique que si les trois écritures restent dans la même app/
 * connexion, d'où ce choix de propriétaire plutôt que `superadmin`.
 *
 * `superadmin` (fédération/ligue, homologation) pilote ce workflow via les
 * routes `/api/internal/player-transfers/*` (service-à-service, voir
 * lib/serviceAuth.ts) — même pattern que la saga d'annulation de match
 * (TASK-P0-003), pas d'écriture directe de superadmin sur cette table.
 *
 * `Player.id` n'est jamais recréé lors d'un transfert (§19) : seul
 * `Player.teamId` change, piloté par PlayerTransferService.complete.
 */
@Entity("player_transfers")
export class PlayerTransfer {
  @PrimaryColumn({ type: "varchar", length: 191 })
  id!: string;

  @Column({ type: "varchar", length: 191, name: "player_id" })
  playerId!: string;

  @ManyToOne(() => Player, { onDelete: "CASCADE" })
  @JoinColumn({ name: "player_id" })
  player?: Player;

  @Column({ type: "char", length: 36, name: "from_team_id" })
  fromTeamId!: string;

  @ManyToOne(() => Team, { onDelete: "CASCADE" })
  @JoinColumn({ name: "from_team_id" })
  fromTeam?: Team;

  @Column({ type: "char", length: 36, name: "to_team_id" })
  toTeamId!: string;

  @ManyToOne(() => Team, { onDelete: "CASCADE" })
  @JoinColumn({ name: "to_team_id" })
  toTeam?: Team;

  @Column({
    type: "enum",
    enum: ["PERMANENT", "LOAN", "LOAN_RETURN", "FREE_TRANSFER"],
    name: "transfer_type",
  })
  transferType!: PlayerTransferType;

  @Column({
    type: "enum",
    enum: ["DRAFT", "PENDING", "APPROVED", "COMPLETED", "CANCELLED", "REJECTED"],
    default: "PENDING",
  })
  status!: PlayerTransferStatus;

  /** Date à laquelle le transfert prend effet — utilisée pour clôturer/ouvrir les TeamMember et vérifier l'appartenance historique (§22). */
  @Column({ type: "date", name: "effective_date" })
  effectiveDate!: string;

  @Column({ type: "varchar", length: 191, nullable: true, name: "season_id" })
  seasonId?: string | null;

  @Column({ type: "decimal", precision: 12, scale: 2, nullable: true })
  fee?: string | null;

  @Column({ type: "varchar", length: 8, nullable: true })
  currency?: string | null;

  @Column({ type: "date", nullable: true, name: "loan_start_date" })
  loanStartDate?: string | null;

  @Column({ type: "date", nullable: true, name: "loan_end_date" })
  loanEndDate?: string | null;

  @Column({ type: "text", nullable: true })
  notes?: string | null;

  /** Identité de l'auteur (ex: email FEDERATION_ADMIN côté superadmin) — pas de FK vers `User` : l'acteur n'est jamais un compte club teamManager. */
  @Column({ type: "varchar", length: 191, nullable: true, name: "created_by" })
  createdBy?: string | null;

  @Column({ type: "varchar", length: 191, nullable: true, name: "approved_by" })
  approvedBy?: string | null;

  @Column({ type: "text", nullable: true, name: "status_reason" })
  statusReason?: string | null;

  @CreateDateColumn({ type: "datetime", name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "datetime", name: "updated_at" })
  updatedAt!: Date;
}

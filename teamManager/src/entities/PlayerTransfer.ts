import { Entity, PrimaryColumn, Column, CreateDateColumn } from "typeorm";

/**
 * Mappée sur `player_transfers`, table possédée par `superadmin` (module
 * transferts, voir db/OWNERSHIP.md et superadmin/src/lib/adminPlayerTransfers.ts).
 * Lecture seule ici — alimente l'historique des transferts du club dans
 * /admin/players/transfers. teamManager ne modifie jamais cette table ni
 * `Player.teamId` (colonne écrite uniquement par superadmin pour cette
 * opération).
 */
@Entity("player_transfers")
export class PlayerTransfer {
  @PrimaryColumn({ type: "char", length: 36 })
  id!: string;

  @Column({ type: "varchar", length: 191, name: "player_id" })
  playerId!: string;

  @Column({ type: "varchar", length: 383, name: "player_name_fr" })
  playerNameFr!: string;

  @Column({ type: "int", nullable: true, name: "player_number" })
  playerNumber!: number | null;

  @Column({ type: "char", length: 36, name: "from_team_id" })
  fromTeamId!: string;

  @Column({ type: "char", length: 36, name: "to_team_id" })
  toTeamId!: string;

  @Column({ type: "text", nullable: true })
  note!: string | null;

  @Column({ type: "varchar", length: 191, nullable: true, name: "performed_by" })
  performedBy!: string | null;

  @CreateDateColumn({ type: "datetime", name: "transferred_at" })
  transferredAt!: Date;
}

import { Entity, PrimaryColumn, Column, CreateDateColumn } from "typeorm";

/**
 * Mappée sur `player_transfers`, table possédée par `superadmin` (module
 * transferts, voir db/OWNERSHIP.md). Lecture seule ici — alimente la
 * section publique « Derniers transferts » de la page d'accueil (voir
 * services/PublicTransferService.ts).
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

  @CreateDateColumn({ type: "datetime", name: "transferred_at" })
  transferredAt!: Date;
}

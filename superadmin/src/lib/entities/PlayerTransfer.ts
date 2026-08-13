import { Column, Entity, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm'

/**
 * Historique des transferts de joueurs entre clubs — table propre à
 * `superadmin` (voir mysql/migration_add_player_transfers.sql et
 * db/OWNERSHIP.md). `playerNameFr`/`playerNumber` sont des instantanés pris
 * au moment du transfert : l'historique reste lisible même si le joueur
 * est plus tard retiré ou renommé côté teamManager (source de vérité de
 * `Player`).
 */
@Entity({ name: 'player_transfers' })
export class PlayerTransfer {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  // FK logique vers Player.id (table teamManager).
  @Column({ type: 'varchar', length: 191, name: 'player_id' })
  playerId!: string

  @Column({ type: 'varchar', length: 383, name: 'player_name_fr' })
  playerNameFr!: string

  @Column({ type: 'int', nullable: true, name: 'player_number' })
  playerNumber?: number | null

  // FK logique vers teams.id.
  @Column({ type: 'char', length: 36, name: 'from_team_id' })
  fromTeamId!: string

  @Column({ type: 'char', length: 36, name: 'to_team_id' })
  toTeamId!: string

  @Column({ type: 'text', nullable: true })
  note?: string | null

  // User.id (sso, superadmin) qui a effectué le transfert.
  @Column({ type: 'varchar', length: 191, nullable: true, name: 'performed_by' })
  performedBy?: string | null

  @CreateDateColumn({ type: 'datetime', name: 'transferred_at' })
  transferredAt!: Date
}

-- migration.md §19-21 (Phase 3) : module central de transfert/homologation
-- de joueur. Table propre à teamManager (possède déjà Player et
-- cms_team_members) — un transfert COMPLETED clôture l'ancienne affiliation
-- cms_team_members, en crée une nouvelle et met à jour Player.teamId dans
-- une seule transaction (voir PlayerTransferService.complete). Additive,
-- n'affecte aucune donnée existante ; Player.id n'est jamais recréé.

USE foot;

CREATE TABLE IF NOT EXISTS player_transfers (
  id VARCHAR(191) NOT NULL PRIMARY KEY,
  player_id VARCHAR(191) NOT NULL,
  from_team_id CHAR(36) NOT NULL,
  to_team_id CHAR(36) NOT NULL,
  transfer_type ENUM('PERMANENT', 'LOAN', 'LOAN_RETURN', 'FREE_TRANSFER') NOT NULL,
  status ENUM('DRAFT', 'PENDING', 'APPROVED', 'COMPLETED', 'CANCELLED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
  effective_date DATE NOT NULL,
  season_id VARCHAR(191) NULL,
  fee DECIMAL(12, 2) NULL,
  currency VARCHAR(8) NULL,
  loan_start_date DATE NULL,
  loan_end_date DATE NULL,
  notes TEXT NULL,
  created_by VARCHAR(191) NULL,
  approved_by VARCHAR(191) NULL,
  status_reason TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_player_transfers_player (player_id),
  KEY idx_player_transfers_from_team (from_team_id),
  KEY idx_player_transfers_to_team (to_team_id),
  KEY idx_player_transfers_status (status),
  CONSTRAINT fk_player_transfers_player FOREIGN KEY (player_id) REFERENCES `Player` (id) ON DELETE CASCADE,
  CONSTRAINT fk_player_transfers_from_team FOREIGN KEY (from_team_id) REFERENCES teams (id) ON DELETE CASCADE,
  CONSTRAINT fk_player_transfers_to_team FOREIGN KEY (to_team_id) REFERENCES teams (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

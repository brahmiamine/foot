-- PLAYER-001 : demandes de modification de profil joueur.
-- Club Hub reste propriétaire de la table Player et de ce workflow.
-- Player Hub n'écrit jamais directement Player : il passe par l'API interne Club Hub.

USE foot;

CREATE TABLE IF NOT EXISTS cms_player_profile_change_requests (
  id CHAR(36) PRIMARY KEY,
  team_id CHAR(36) NOT NULL,
  player_id VARCHAR(191) NOT NULL,
  requester_user_id VARCHAR(191) NOT NULL,
  status ENUM('PENDING','APPROVED','REJECTED','STALE','AUTO_APPLIED') NOT NULL DEFAULT 'PENDING',
  requested_changes JSON NOT NULL,
  before_snapshot JSON NOT NULL,
  reviewer_user_id VARCHAR(191) NULL,
  review_reason TEXT NULL,
  resolved_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_profile_change_request_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
  CONSTRAINT fk_profile_change_request_player FOREIGN KEY (player_id) REFERENCES Player(id) ON DELETE CASCADE,
  INDEX idx_player_profile_requests_team_status (team_id, status, created_at),
  INDEX idx_player_profile_requests_player (team_id, player_id, created_at),
  INDEX idx_player_profile_requests_requester (requester_user_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

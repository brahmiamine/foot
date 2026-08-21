-- PLAYER-002/004/005 (platform-governance-roadmap.md, section joueurs) :
-- disponibilité structurée déclarée par le joueur, consentements/signatures
-- joueur avec historique, demandes administratives joueur avec suivi.
-- Ces tables suivent la même convention que
-- migration_add_player_profile_change_requests.sql : possédées par
-- club-hub (préfixe cms_), mais écrites directement par player-hub pour ses
-- propres lignes (même principe que cms_convocations.response) — aucune
-- validation métier complexe n'est requise ici, contrairement à PLAYER-001
-- qui modifie la fiche joueur elle-même et passe donc par l'API interne.

USE foot;

-- PLAYER-002 — disponibilité structurée AVAILABLE/UNAVAILABLE/LIMITED,
-- période + motif. Consommée en lecture seule par staff-hub lors de la
-- composition (voir staff-hub/src/entities/PlayerAvailabilityDeclaration.ts).
CREATE TABLE IF NOT EXISTS cms_player_availability_declarations (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  team_id CHAR(36) NOT NULL,
  player_id VARCHAR(191) NOT NULL,
  status ENUM('AVAILABLE','UNAVAILABLE','LIMITED') NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason VARCHAR(500) NULL,
  declared_by_user_id VARCHAR(191) NOT NULL,
  cancelled_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_player_availability_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
  CONSTRAINT fk_player_availability_player FOREIGN KEY (player_id) REFERENCES Player(id) ON DELETE CASCADE,
  INDEX idx_player_availability_player_period (player_id, start_date, end_date, cancelled_at),
  INDEX idx_player_availability_team (team_id, start_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- PLAYER-004 — consentements/signatures joueur (contrat/transfert/licence/
-- image/règlement). Append-only : chaque signature est une nouvelle ligne,
-- l'historique est donc la liste elle-même, jamais de mutation en place.
CREATE TABLE IF NOT EXISTS cms_player_consents (
  id CHAR(36) PRIMARY KEY,
  team_id CHAR(36) NOT NULL,
  player_id VARCHAR(191) NOT NULL,
  consent_type ENUM('CONTRACT','TRANSFER','LICENSE','IMAGE_RIGHTS','REGULATION') NOT NULL,
  reference_id VARCHAR(191) NULL,
  signed_at DATETIME NOT NULL,
  signed_by_user_id VARCHAR(191) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_player_consent_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
  CONSTRAINT fk_player_consent_player FOREIGN KEY (player_id) REFERENCES Player(id) ON DELETE CASCADE,
  INDEX idx_player_consents_player_type (player_id, consent_type, signed_at),
  INDEX idx_player_consents_team (team_id, signed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- PLAYER-005 (P2) — demandes administratives joueur (attestations/documents/
-- rendez-vous) avec suivi côté club : statut + note staff + résolution.
CREATE TABLE IF NOT EXISTS cms_player_administrative_requests (
  id CHAR(36) PRIMARY KEY,
  team_id CHAR(36) NOT NULL,
  player_id VARCHAR(191) NOT NULL,
  requester_user_id VARCHAR(191) NOT NULL,
  request_type ENUM('ATTESTATION','DOCUMENT','APPOINTMENT') NOT NULL,
  details TEXT NOT NULL,
  status ENUM('NEW','IN_PROGRESS','FULFILLED','REJECTED') NOT NULL DEFAULT 'NEW',
  staff_user_id VARCHAR(191) NULL,
  staff_note TEXT NULL,
  resolved_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_player_admin_request_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
  CONSTRAINT fk_player_admin_request_player FOREIGN KEY (player_id) REFERENCES Player(id) ON DELETE CASCADE,
  INDEX idx_player_admin_requests_team_status (team_id, status, created_at),
  INDEX idx_player_admin_requests_player (player_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

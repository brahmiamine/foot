-- Migration : suivi des blessures & santé des joueurs (module à accès
-- strictement restreint, voir permission "medical.*" dans lib/permissions.ts
-- — non accordée par défaut aux rôles Coach/Adjoint/Secrétaire, seulement
-- au rôle "Staff médical" et à l'administrateur du club). Additive, propre
-- à club-hub, scopée par team_id.

USE foot;

CREATE TABLE cms_injuries (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  team_id CHAR(36) NOT NULL,
  player_id VARCHAR(191) NOT NULL,
  injury_date DATE NOT NULL,
  zone VARCHAR(100) NOT NULL,
  severity ENUM('MINOR', 'MODERATE', 'SEVERE') NOT NULL DEFAULT 'MINOR',
  description VARCHAR(500) NULL,
  diagnosis VARCHAR(500) NULL,
  unavailability_days INT NULL,
  expected_return_date DATE NULL,
  actual_return_date DATE NULL,
  progressive_return TINYINT(1) NOT NULL DEFAULT 0,
  progressive_return_notes VARCHAR(500) NULL,
  documents TEXT NULL,
  status ENUM('ONGOING', 'RECOVERING', 'RESOLVED') NOT NULL DEFAULT 'ONGOING',
  notes TEXT NULL,
  created_by VARCHAR(191) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_cms_injuries_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
  CONSTRAINT fk_cms_injuries_player FOREIGN KEY (player_id) REFERENCES Player(id) ON DELETE CASCADE,
  CONSTRAINT fk_cms_injuries_creator FOREIGN KEY (created_by) REFERENCES User(id) ON DELETE SET NULL,
  INDEX idx_cms_injuries_team_player (team_id, player_id),
  INDEX idx_cms_injuries_status (team_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

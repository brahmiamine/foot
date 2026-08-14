-- Migration : planches tactiques des coachs (exercices d'entraînement,
-- schémas), propres à club-hub, scopées par team_id (CHAR36 -> teams.id)
-- et par propriétaire (owner_id -> User.id). Une planche est privée par
-- défaut (visible seulement par son auteur) ; `is_public = 1` la rend
-- visible en lecture aux autres membres du club ayant le droit
-- `tactics.view` (typiquement les autres coachs), jamais modifiable par eux.
--
-- Additive uniquement, aucune table/colonne partagée touchée.

USE foot;

CREATE TABLE cms_tactics_boards (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  team_id CHAR(36) NOT NULL,
  owner_id VARCHAR(191) NOT NULL,
  category ENUM(
    'seniors',
    'u21', 'u20', 'u19', 'u18', 'u17', 'u16', 'u15', 'u14', 'u13',
    'u12', 'u11', 'u10', 'u9', 'u8', 'u7'
  ) NULL,
  title VARCHAR(200) NOT NULL,
  description VARCHAR(500) NULL,
  content LONGTEXT NOT NULL,
  is_public TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_cms_tactics_boards_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
  CONSTRAINT fk_cms_tactics_boards_owner FOREIGN KEY (owner_id) REFERENCES User(id) ON DELETE CASCADE,
  INDEX idx_cms_tactics_boards_team_owner (team_id, owner_id),
  INDEX idx_cms_tactics_boards_public (team_id, is_public)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

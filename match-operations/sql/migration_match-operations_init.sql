-- Migration: feuille de match électronique ("match-operations").
-- Tables additives ms_*, non destructives, sur la base partagée "foot"
-- (mêmes matches/teams/Player/Card/CardReason que les autres apps).
--
-- Modèle : une feuille (ms_sheets) par match, remplie sur place par
-- l'arbitre depuis un kiosque plein écran, sans authentification (comme une
-- feuille papier — la preuve de présence est la signature elle-même, pas un
-- login). Les cartons restent enregistrés dans la table `Card` partagée
-- (visibles immédiatement dans le module discipline de club-hub) ; on
-- lui ajoute juste une colonne `period` pour savoir sur quel temps de jeu
-- (1ère/2e mi-temps, prolongations) le carton a été donné.

USE foot;

ALTER TABLE Card
  ADD COLUMN period ENUM('H1','H2','ET1','ET2') NULL AFTER minute;

CREATE TABLE ms_sheets (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  match_id CHAR(36) NOT NULL,
  status ENUM('DRAFT','PRE_MATCH_SIGNED','IN_PROGRESS','POST_MATCH_SIGNED','CLOSED') NOT NULL DEFAULT 'DRAFT',
  pre_match_signed_at DATETIME NULL,
  post_match_signed_at DATETIME NULL,
  closed_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_ms_sheets_match FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
  UNIQUE KEY uq_ms_sheets_match (match_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE ms_signatures (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  sheet_id BIGINT NOT NULL,
  phase ENUM('PRE_MATCH','POST_MATCH') NOT NULL,
  actor_role ENUM('TEAM_HOME','TEAM_AWAY','REFEREE') NOT NULL,
  signer_name VARCHAR(191) NULL,
  signature_data LONGTEXT NOT NULL,
  signed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_ms_signatures_sheet FOREIGN KEY (sheet_id) REFERENCES ms_sheets(id) ON DELETE CASCADE,
  UNIQUE KEY uq_ms_signatures_actor (sheet_id, phase, actor_role),
  INDEX idx_ms_signatures_sheet (sheet_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE ms_goals (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  sheet_id BIGINT NOT NULL,
  match_id CHAR(36) NOT NULL,
  team_id CHAR(36) NOT NULL,
  player_id VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  minute INT NOT NULL,
  period ENUM('H1','H2','ET1','ET2') NOT NULL DEFAULT 'H1',
  is_own_goal TINYINT(1) NOT NULL DEFAULT 0,
  is_penalty TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_ms_goals_sheet FOREIGN KEY (sheet_id) REFERENCES ms_sheets(id) ON DELETE CASCADE,
  CONSTRAINT fk_ms_goals_match FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
  CONSTRAINT fk_ms_goals_player FOREIGN KEY (player_id) REFERENCES Player(id) ON DELETE SET NULL,
  INDEX idx_ms_goals_sheet (sheet_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE ms_injuries (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  sheet_id BIGINT NOT NULL,
  match_id CHAR(36) NOT NULL,
  team_id CHAR(36) NOT NULL,
  player_id VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  minute INT NULL,
  period ENUM('H1','H2','ET1','ET2') NULL,
  description TEXT NULL,
  requires_substitution TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_ms_injuries_sheet FOREIGN KEY (sheet_id) REFERENCES ms_sheets(id) ON DELETE CASCADE,
  CONSTRAINT fk_ms_injuries_match FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
  CONSTRAINT fk_ms_injuries_player FOREIGN KEY (player_id) REFERENCES Player(id) ON DELETE SET NULL,
  INDEX idx_ms_injuries_sheet (sheet_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE ms_substitutions (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  sheet_id BIGINT NOT NULL,
  match_id CHAR(36) NOT NULL,
  team_id CHAR(36) NOT NULL,
  player_out_id VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  player_in_id VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  minute INT NOT NULL,
  period ENUM('H1','H2','ET1','ET2') NOT NULL DEFAULT 'H1',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_ms_subs_sheet FOREIGN KEY (sheet_id) REFERENCES ms_sheets(id) ON DELETE CASCADE,
  CONSTRAINT fk_ms_subs_match FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
  CONSTRAINT fk_ms_subs_player_out FOREIGN KEY (player_out_id) REFERENCES Player(id) ON DELETE CASCADE,
  CONSTRAINT fk_ms_subs_player_in FOREIGN KEY (player_in_id) REFERENCES Player(id) ON DELETE CASCADE,
  INDEX idx_ms_subs_sheet (sheet_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- Réserves (réclamations formelles consignées sur la feuille, avant ou
-- après le match) déposées par l'une des équipes ou par l'arbitre.
CREATE TABLE ms_reservations (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  sheet_id BIGINT NOT NULL,
  phase ENUM('PRE_MATCH','POST_MATCH') NOT NULL,
  author_role ENUM('TEAM_HOME','TEAM_AWAY','REFEREE') NOT NULL,
  content TEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_ms_reservations_sheet FOREIGN KEY (sheet_id) REFERENCES ms_sheets(id) ON DELETE CASCADE,
  INDEX idx_ms_reservations_sheet (sheet_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

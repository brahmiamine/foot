-- Phase 1 de la communauté des supporters (#13-17) : socle sur lequel
-- viendront se brancher les votes, le fan wall et le hall of fame (phase 2).
-- Tables préfixées `ob_`, propriété exclusive du site public `ob` (les
-- autres apps n'y touchent pas, contrairement aux tables vitrine
-- lues par `ob` mais gérées par teamManager/superadmin/arbinote).
--
-- FK vers `User` (table de `sso`) possibles car même base "foot".

USE foot;

CREATE TABLE ob_members (
  user_id VARCHAR(191) NOT NULL PRIMARY KEY,
  points INT NOT NULL DEFAULT 0,
  is_blocked TINYINT(1) NOT NULL DEFAULT 0,
  bio TEXT NULL,
  avatar_url TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_ob_members_user FOREIGN KEY (user_id) REFERENCES `User` (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE ob_follows (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id VARCHAR(191) NOT NULL,
  target_type ENUM('TEAM', 'PLAYER') NOT NULL,
  target_id VARCHAR(191) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_ob_follow (user_id, target_type, target_id),
  CONSTRAINT fk_ob_follows_user FOREIGN KEY (user_id) REFERENCES ob_members (user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE ob_points_ledger (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id VARCHAR(191) NOT NULL,
  points INT NOT NULL,
  reason VARCHAR(64) NOT NULL,
  ref_type VARCHAR(32) NULL,
  ref_id VARCHAR(191) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_ob_points_ledger_user (user_id, created_at),
  CONSTRAINT fk_ob_points_ledger_user FOREIGN KEY (user_id) REFERENCES ob_members (user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE ob_badges (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  name VARCHAR(191) NOT NULL,
  description VARCHAR(255) NOT NULL,
  icon VARCHAR(16) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE ob_member_badges (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id VARCHAR(191) NOT NULL,
  badge_id VARCHAR(64) NOT NULL,
  awarded_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_ob_member_badge (user_id, badge_id),
  CONSTRAINT fk_ob_member_badges_user FOREIGN KEY (user_id) REFERENCES ob_members (user_id) ON DELETE CASCADE,
  CONSTRAINT fk_ob_member_badges_badge FOREIGN KEY (badge_id) REFERENCES ob_badges (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE ob_posts (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id VARCHAR(191) NOT NULL,
  body TEXT NOT NULL,
  image_url TEXT NULL,
  status ENUM('PUBLISHED', 'HIDDEN') NOT NULL DEFAULT 'PUBLISHED',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_ob_posts_created (status, created_at),
  CONSTRAINT fk_ob_posts_user FOREIGN KEY (user_id) REFERENCES ob_members (user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- target_type NEWS référence `cms_news.id` (teamManager), POST référence
-- ob_posts.id : cible polymorphe, pas de FK possible côté target.
CREATE TABLE ob_comments (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  target_type ENUM('POST', 'NEWS') NOT NULL,
  target_id VARCHAR(191) NOT NULL,
  user_id VARCHAR(191) NOT NULL,
  body VARCHAR(1000) NOT NULL,
  status ENUM('PUBLISHED', 'HIDDEN') NOT NULL DEFAULT 'PUBLISHED',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_ob_comments_target (target_type, target_id, status, created_at),
  CONSTRAINT fk_ob_comments_user FOREIGN KEY (user_id) REFERENCES ob_members (user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE ob_reactions (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  target_type ENUM('POST', 'NEWS', 'COMMENT') NOT NULL,
  target_id VARCHAR(191) NOT NULL,
  user_id VARCHAR(191) NOT NULL,
  emoji VARCHAR(8) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_ob_reaction (target_type, target_id, user_id, emoji),
  KEY idx_ob_reactions_target (target_type, target_id),
  CONSTRAINT fk_ob_reactions_user FOREIGN KEY (user_id) REFERENCES ob_members (user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Sert à la fois les sondages libres (#13) et les votes à thème (#18 :
-- homme du match / joueur du mois / but du mois) via `type` + `match_id`.
CREATE TABLE ob_polls (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  question VARCHAR(255) NOT NULL,
  type ENUM('POLL', 'MOTM', 'PLAYER_OF_MONTH', 'GOAL_OF_MONTH') NOT NULL DEFAULT 'POLL',
  -- Collation alignée sur `matches.id`, voir commentaire sur ob_predictions.match_id.
  match_id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_uca1400_ai_ci NULL,
  status ENUM('OPEN', 'CLOSED') NOT NULL DEFAULT 'OPEN',
  created_by VARCHAR(191) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  closes_at DATETIME NULL,
  KEY idx_ob_polls_status (status, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE ob_poll_options (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  poll_id BIGINT NOT NULL,
  label VARCHAR(191) NOT NULL,
  player_id VARCHAR(191) NULL,
  sort_order INT NOT NULL DEFAULT 0,
  CONSTRAINT fk_ob_poll_options_poll FOREIGN KEY (poll_id) REFERENCES ob_polls (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE ob_poll_votes (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  poll_id BIGINT NOT NULL,
  option_id BIGINT NOT NULL,
  user_id VARCHAR(191) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_ob_poll_vote (poll_id, user_id),
  CONSTRAINT fk_ob_poll_votes_poll FOREIGN KEY (poll_id) REFERENCES ob_polls (id) ON DELETE CASCADE,
  CONSTRAINT fk_ob_poll_votes_option FOREIGN KEY (option_id) REFERENCES ob_poll_options (id) ON DELETE CASCADE,
  CONSTRAINT fk_ob_poll_votes_user FOREIGN KEY (user_id) REFERENCES ob_members (user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- match_id référence `matches.id` (ArbiNote/cardManager), pas de FK inter-
-- domaine ici pour rester cohérent avec le reste du schéma (ex: cms_trips).
-- Collation alignée sur `matches.id`/`teams.id` (utf8mb4_uca1400_ai_ci,
-- différente du utf8mb4_unicode_ci par défaut de ces tables `ob_*` calqué
-- sur `User.id`) : sans ça, toute jointure SQL avec `matches` échoue avec
-- "Illegal mix of collations".
CREATE TABLE ob_predictions (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  match_id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_uca1400_ai_ci NOT NULL,
  user_id VARCHAR(191) NOT NULL,
  score_home INT NOT NULL,
  score_away INT NOT NULL,
  points_awarded INT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_ob_prediction (match_id, user_id),
  CONSTRAINT fk_ob_predictions_user FOREIGN KEY (user_id) REFERENCES ob_members (user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO ob_badges (id, name, description, icon, sort_order) VALUES
  ('premier-match', 'Premier match', 'Premier pronostic déposé', '🟢', 10),
  ('premier-deplacement', 'Premier déplacement', 'Premier pronostic sur un match à l''extérieur', '🔴', 20),
  ('fan-historique', 'Fan historique', 'Parmi les 100 premiers membres de l''espace OB', '🏆', 30),
  ('dix-pronostics', '10 pronostics', '10 pronostics déposés', '⚽', 40),
  ('dix-matchs-suivis', '10 matchs suivis', '10 matchs suivis dans la communauté', '🔥', 50),
  ('dix-presences-stade', '10 présences au stade', '10 présences enregistrées au stade', '🏟️', 60),
  ('supporter-fidele', 'Supporter fidèle', 'Un supporter présent saison après saison', '💚', 70),
  ('legende-ob', 'Légende OB', '10 000 points cumulés', '👑', 80);

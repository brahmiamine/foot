-- Community supporter multi-club : interactions, fidélité et modération.
-- Schéma possédé par club-hub ; club-ob ne peut écrire que dans ces tables cms_supporter_*.

CREATE TABLE IF NOT EXISTS cms_supporter_profiles (
  user_id VARCHAR(191) NOT NULL,
  team_id CHAR(36) NOT NULL,
  display_name VARCHAR(120) NULL,
  favorite_player_id VARCHAR(191) NULL,
  favorite_stand VARCHAR(120) NULL,
  points INT NOT NULL DEFAULT 0,
  attended_matches INT NOT NULL DEFAULT 0,
  prediction_count INT NOT NULL DEFAULT 0,
  prediction_hits INT NOT NULL DEFAULT 0,
  vote_count INT NOT NULL DEFAULT 0,
  poll_vote_count INT NOT NULL DEFAULT 0,
  post_count INT NOT NULL DEFAULT 0,
  comment_count INT NOT NULL DEFAULT 0,
  joined_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, team_id),
  INDEX idx_supporter_profiles_team_points (team_id, points DESC),
  CONSTRAINT fk_supporter_profile_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS cms_supporter_predictions (
  id CHAR(36) NOT NULL PRIMARY KEY,
  team_id CHAR(36) NOT NULL,
  user_id VARCHAR(191) NOT NULL,
  match_id CHAR(36) NOT NULL,
  home_score TINYINT UNSIGNED NOT NULL,
  away_score TINYINT UNSIGNED NOT NULL,
  first_scorer_id VARCHAR(191) NULL,
  points_awarded INT NOT NULL DEFAULT 0,
  settled_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_supporter_prediction (team_id, user_id, match_id),
  INDEX idx_supporter_predictions_match (team_id, match_id),
  CONSTRAINT fk_supporter_prediction_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
  CONSTRAINT fk_supporter_prediction_match FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS cms_supporter_match_votes (
  id CHAR(36) NOT NULL PRIMARY KEY,
  team_id CHAR(36) NOT NULL,
  user_id VARCHAR(191) NOT NULL,
  match_id CHAR(36) NOT NULL,
  player_id VARCHAR(191) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_supporter_match_vote (team_id, user_id, match_id),
  INDEX idx_supporter_match_vote_result (team_id, match_id, player_id),
  CONSTRAINT fk_supporter_match_vote_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
  CONSTRAINT fk_supporter_match_vote_match FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS cms_supporter_polls (
  id CHAR(36) NOT NULL PRIMARY KEY,
  team_id CHAR(36) NOT NULL,
  question_fr VARCHAR(500) NOT NULL,
  question_ar VARCHAR(500) NULL,
  status ENUM('DRAFT','OPEN','CLOSED') NOT NULL DEFAULT 'DRAFT',
  starts_at DATETIME NULL,
  ends_at DATETIME NULL,
  created_by VARCHAR(191) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_supporter_polls_active (team_id, status, starts_at, ends_at),
  CONSTRAINT fk_supporter_poll_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS cms_supporter_poll_options (
  id CHAR(36) NOT NULL PRIMARY KEY,
  poll_id CHAR(36) NOT NULL,
  label_fr VARCHAR(255) NOT NULL,
  label_ar VARCHAR(255) NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_supporter_poll_options (poll_id, sort_order),
  CONSTRAINT fk_supporter_poll_option_poll FOREIGN KEY (poll_id) REFERENCES cms_supporter_polls(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS cms_supporter_poll_votes (
  id CHAR(36) NOT NULL PRIMARY KEY,
  team_id CHAR(36) NOT NULL,
  poll_id CHAR(36) NOT NULL,
  option_id CHAR(36) NOT NULL,
  user_id VARCHAR(191) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_supporter_poll_vote (poll_id, user_id),
  INDEX idx_supporter_poll_vote_option (poll_id, option_id),
  CONSTRAINT fk_supporter_poll_vote_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
  CONSTRAINT fk_supporter_poll_vote_poll FOREIGN KEY (poll_id) REFERENCES cms_supporter_polls(id) ON DELETE CASCADE,
  CONSTRAINT fk_supporter_poll_vote_option FOREIGN KEY (option_id) REFERENCES cms_supporter_poll_options(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS cms_supporter_posts (
  id CHAR(36) NOT NULL PRIMARY KEY,
  team_id CHAR(36) NOT NULL,
  author_user_id VARCHAR(191) NOT NULL,
  author_name VARCHAR(120) NULL,
  source_type ENUM('SUPPORTER','CLUB') NOT NULL DEFAULT 'SUPPORTER',
  visibility ENUM('PUBLIC','MEMBER') NOT NULL DEFAULT 'PUBLIC',
  title VARCHAR(255) NULL,
  body VARCHAR(1500) NOT NULL,
  image_url VARCHAR(1000) NULL,
  status ENUM('PENDING','APPROVED','REJECTED') NOT NULL DEFAULT 'PENDING',
  moderated_by VARCHAR(191) NULL,
  moderated_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_supporter_posts_feed (team_id, status, visibility, created_at),
  INDEX idx_supporter_posts_moderation (team_id, status, created_at),
  CONSTRAINT fk_supporter_post_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS cms_supporter_reactions (
  id CHAR(36) NOT NULL PRIMARY KEY,
  team_id CHAR(36) NOT NULL,
  user_id VARCHAR(191) NOT NULL,
  target_type ENUM('NEWS','POST') NOT NULL,
  target_id VARCHAR(191) NOT NULL,
  reaction ENUM('LIKE','FIRE','BRAVO','SAD') NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_supporter_reaction (team_id, user_id, target_type, target_id),
  INDEX idx_supporter_reaction_target (team_id, target_type, target_id, reaction),
  CONSTRAINT fk_supporter_reaction_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS cms_supporter_comments (
  id CHAR(36) NOT NULL PRIMARY KEY,
  team_id CHAR(36) NOT NULL,
  user_id VARCHAR(191) NOT NULL,
  author_name VARCHAR(120) NULL,
  target_type ENUM('NEWS','POST') NOT NULL,
  target_id VARCHAR(191) NOT NULL,
  body VARCHAR(1000) NOT NULL,
  status ENUM('PENDING','APPROVED','REJECTED') NOT NULL DEFAULT 'PENDING',
  moderated_by VARCHAR(191) NULL,
  moderated_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_supporter_comments_target (team_id, target_type, target_id, status, created_at),
  INDEX idx_supporter_comments_moderation (team_id, status, created_at),
  CONSTRAINT fk_supporter_comment_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS cms_supporter_loyalty_events (
  id CHAR(36) NOT NULL PRIMARY KEY,
  team_id CHAR(36) NOT NULL,
  user_id VARCHAR(191) NOT NULL,
  event_type ENUM('ATTENDANCE','PREDICTION','MATCH_VOTE','POLL','POST','COMMENT','PROFILE','OTHER') NOT NULL,
  points INT NOT NULL,
  source_key VARCHAR(255) NOT NULL,
  label VARCHAR(255) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_supporter_loyalty_source (team_id, user_id, source_key),
  INDEX idx_supporter_loyalty_month (team_id, created_at, points),
  CONSTRAINT fk_supporter_loyalty_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS cms_supporter_badges (
  code VARCHAR(50) NOT NULL PRIMARY KEY,
  label_fr VARCHAR(120) NOT NULL,
  label_ar VARCHAR(120) NOT NULL,
  description_fr VARCHAR(255) NOT NULL,
  description_ar VARCHAR(255) NOT NULL,
  icon VARCHAR(16) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS cms_supporter_member_badges (
  team_id CHAR(36) NOT NULL,
  user_id VARCHAR(191) NOT NULL,
  badge_code VARCHAR(50) NOT NULL,
  awarded_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (team_id, user_id, badge_code),
  CONSTRAINT fk_supporter_member_badge_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
  CONSTRAINT fk_supporter_member_badge_badge FOREIGN KEY (badge_code) REFERENCES cms_supporter_badges(code) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS cms_supporter_groups (
  id CHAR(36) NOT NULL PRIMARY KEY,
  team_id CHAR(36) NOT NULL,
  name VARCHAR(160) NOT NULL,
  description VARCHAR(1000) NULL,
  status ENUM('ACTIVE','ARCHIVED') NOT NULL DEFAULT 'ACTIVE',
  created_by VARCHAR(191) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_supporter_group_name (team_id, name),
  CONSTRAINT fk_supporter_group_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS cms_supporter_group_members (
  group_id CHAR(36) NOT NULL,
  team_id CHAR(36) NOT NULL,
  user_id VARCHAR(191) NOT NULL,
  joined_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (group_id, user_id),
  INDEX idx_supporter_group_member_user (team_id, user_id),
  CONSTRAINT fk_supporter_group_member_group FOREIGN KEY (group_id) REFERENCES cms_supporter_groups(id) ON DELETE CASCADE,
  CONSTRAINT fk_supporter_group_member_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS cms_supporter_group_events (
  id CHAR(36) NOT NULL PRIMARY KEY,
  group_id CHAR(36) NOT NULL,
  team_id CHAR(36) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description VARCHAR(1000) NULL,
  location VARCHAR(255) NULL,
  starts_at DATETIME NOT NULL,
  created_by VARCHAR(191) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_supporter_group_events (team_id, starts_at),
  CONSTRAINT fk_supporter_group_event_group FOREIGN KEY (group_id) REFERENCES cms_supporter_groups(id) ON DELETE CASCADE,
  CONSTRAINT fk_supporter_group_event_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO cms_supporter_badges (code, label_fr, label_ar, description_fr, description_ar, icon, sort_order) VALUES
  ('FIRST_MATCH', 'Premier match', 'أول مباراة', 'Présent à un premier match du club.', 'حضر أول مباراة للنادي.', '🎟️', 10),
  ('STADIUM_5', 'Fidèle OB', 'وفيّ للأولمبي', 'Présent à au moins 5 matchs.', 'حضر 5 مباريات على الأقل.', '🔴', 20),
  ('STADIUM_10', 'Tribune fidèle', 'وفيّ للمدرج', 'Présent à au moins 10 matchs.', 'حضر 10 مباريات على الأقل.', '🏟️', 30),
  ('PREDICTOR_10', 'Pronostiqueur', 'خبير التوقعات', 'A participé à au moins 10 pronostics.', 'شارك في 10 توقعات على الأقل.', '🎯', 40),
  ('ORACLE_5', 'Œil juste', 'عين ثاقبة', 'Au moins 5 pronostics avec résultat correct.', 'خمسة توقعات صحيحة على الأقل.', '🔮', 50),
  ('COMMUNITY_20', 'Voix des Cigognes', 'صوت اللقالق', 'Au moins 20 participations communautaires.', '20 مشاركة مجتمعية على الأقل.', '🗣️', 60)
ON DUPLICATE KEY UPDATE
  label_fr = VALUES(label_fr), label_ar = VALUES(label_ar),
  description_fr = VALUES(description_fr), description_ar = VALUES(description_ar),
  icon = VALUES(icon), sort_order = VALUES(sort_order);

-- Confidentialité : `display_name` est un pseudonyme public stable dérivé des
-- identifiants techniques. Le nom/email SSO ne doit jamais être persisté dans
-- les surfaces communautaires, même si un appelant applicatif se trompe.
UPDATE cms_supporter_profiles
SET display_name = CONCAT('Supporter ', UPPER(SUBSTRING(SHA2(CONCAT(team_id, ':', user_id), 256), 1, 6)));

DROP TRIGGER IF EXISTS trg_supporter_profile_public_name_insert;
DROP TRIGGER IF EXISTS trg_supporter_profile_public_name_update;

DELIMITER //
CREATE TRIGGER trg_supporter_profile_public_name_insert
BEFORE INSERT ON cms_supporter_profiles
FOR EACH ROW
BEGIN
  SET NEW.display_name = CONCAT('Supporter ', UPPER(SUBSTRING(SHA2(CONCAT(NEW.team_id, ':', NEW.user_id), 256), 1, 6)));
END//

CREATE TRIGGER trg_supporter_profile_public_name_update
BEFORE UPDATE ON cms_supporter_profiles
FOR EACH ROW
BEGIN
  SET NEW.display_name = CONCAT('Supporter ', UPPER(SUBSTRING(SHA2(CONCAT(NEW.team_id, ':', NEW.user_id), 256), 1, 6)));
END//
DELIMITER ;

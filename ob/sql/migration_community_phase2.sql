-- Phase 2 de la communauté des supporters (#19 modération, #20 fan wall,
-- #29 hall of fame). Le hall of fame n'a pas de table dédiée : il se
-- calcule à partir de ob_points_ledger / ob_posts / ob_comments / ob_members
-- déjà en place depuis la phase 1 (voir LeaderboardService).

USE foot;

CREATE TABLE ob_reports (
  id INT AUTO_INCREMENT PRIMARY KEY,
  target_type ENUM('POST', 'COMMENT', 'FAN_WALL_ITEM') NOT NULL,
  target_id VARCHAR(191) NOT NULL,
  reported_by VARCHAR(191) NOT NULL,
  reason VARCHAR(500) NULL,
  status ENUM('OPEN', 'RESOLVED', 'DISMISSED') NOT NULL DEFAULT 'OPEN',
  resolved_by VARCHAR(191) NULL,
  resolved_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_ob_reports_status (status, created_at),
  CONSTRAINT fk_ob_reports_reporter FOREIGN KEY (reported_by) REFERENCES ob_members (user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- actor_user_id référence `User.id` (compte staff) directement plutôt que
-- ob_members : un membre bloqué ne doit pas perdre son historique
-- d'actions de modération passées si jamais un staff est un jour bloqué
-- (cas limite, mais la FK sur ob_members se supprimerait en cascade).
CREATE TABLE ob_moderation_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  actor_user_id VARCHAR(191) NOT NULL,
  action ENUM(
    'HIDE_POST', 'HIDE_COMMENT',
    'BLOCK_USER', 'UNBLOCK_USER',
    'APPROVE_FAN_WALL', 'REJECT_FAN_WALL',
    'RESOLVE_REPORT', 'DISMISS_REPORT'
  ) NOT NULL,
  target_type VARCHAR(32) NOT NULL,
  target_id VARCHAR(191) NOT NULL,
  reason VARCHAR(500) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_ob_moderation_log_target (target_type, target_id),
  KEY idx_ob_moderation_log_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE ob_fan_wall_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id VARCHAR(191) NOT NULL,
  message VARCHAR(500) NULL,
  image_url TEXT NULL,
  video_url TEXT NULL,
  status ENUM('PENDING', 'PUBLISHED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
  reviewed_by VARCHAR(191) NULL,
  reviewed_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_ob_fan_wall_status (status, created_at),
  CONSTRAINT fk_ob_fan_wall_user FOREIGN KEY (user_id) REFERENCES ob_members (user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

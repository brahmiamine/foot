-- Notifications centralisées (in-app + email), table partagée avec matchsheet.
-- `start.sh` la crée automatiquement (idempotent) au démarrage local ; ce
-- fichier sert de référence / de moyen manuel de l'appliquer sur un
-- environnement qui ne passe pas par start.sh (staging, prod...).
-- Voir aussi db/foot.sql (schéma de référence pour un environnement neuf).

CREATE TABLE IF NOT EXISTS platform_notifications (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id VARCHAR(191) NOT NULL,
  team_id CHAR(36) NULL,
  source_app VARCHAR(20) NOT NULL,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(200) NOT NULL,
  body TEXT NOT NULL,
  url VARCHAR(500) NULL,
  match_id CHAR(36) NULL,
  is_urgent TINYINT(1) NOT NULL DEFAULT 0,
  read_at DATETIME NULL,
  email_status ENUM('PENDING','SENT','FAILED','SKIPPED') NOT NULL DEFAULT 'PENDING',
  email_sent_at DATETIME NULL,
  email_error VARCHAR(500) NULL,
  created_by VARCHAR(191) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_platform_notifications_user FOREIGN KEY (user_id) REFERENCES User(id) ON DELETE CASCADE,
  CONSTRAINT fk_platform_notifications_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
  CONSTRAINT fk_platform_notifications_match FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE SET NULL,
  INDEX idx_platform_notifications_user (user_id, read_at),
  INDEX idx_platform_notifications_email_status (email_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE IF NOT EXISTS notification_preferences (
  user_id VARCHAR(191) NOT NULL PRIMARY KEY,
  email_enabled TINYINT(1) NOT NULL DEFAULT 1,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_notification_preferences_user FOREIGN KEY (user_id) REFERENCES User(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

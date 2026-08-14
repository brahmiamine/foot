-- Données privées de l'Espace Arbitre : indisponibilités et rapports
-- complémentaires. Migration additive, compatible avec la base partagée.

USE foot;

CREATE TABLE IF NOT EXISTS referee_unavailabilities (
  id BIGINT NOT NULL AUTO_INCREMENT,
  user_id VARCHAR(191) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason VARCHAR(500) NULL,
  cancelled_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_referee_unavailability_user_dates (user_id, start_date, end_date),
  KEY idx_referee_unavailability_active (user_id, cancelled_at),
  CONSTRAINT chk_referee_unavailability_dates CHECK (end_date >= start_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE IF NOT EXISTS referee_match_reports (
  id BIGINT NOT NULL AUTO_INCREMENT,
  assignment_id BIGINT NOT NULL,
  match_id CHAR(36) NOT NULL,
  user_id VARCHAR(191) NOT NULL,
  role VARCHAR(64) NOT NULL,
  subject VARCHAR(180) NOT NULL,
  content TEXT NOT NULL,
  status ENUM('DRAFT', 'SUBMITTED') NOT NULL DEFAULT 'DRAFT',
  submitted_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_referee_report_assignment (assignment_id),
  KEY idx_referee_report_user_status (user_id, status),
  KEY idx_referee_report_match_status (match_id, status),
  CONSTRAINT fk_referee_report_assignment FOREIGN KEY (assignment_id) REFERENCES match_official_assignments(id) ON DELETE RESTRICT,
  CONSTRAINT fk_referee_report_match FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

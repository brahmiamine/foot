-- REF-006 — policy de désignation MANUAL/SUGGESTED/AUTO (grade/dispo/repos/
-- distance/historique). Ligne unique PLATFORM, historisée par incrément de
-- version (append-only) : la dernière ligne fait foi, `resolve()` prend
-- toujours la version la plus haute.

CREATE TABLE IF NOT EXISTS ms_official_designation_policies (
  id BIGINT NOT NULL AUTO_INCREMENT,
  mode ENUM('MANUAL','SUGGESTED','AUTO') NOT NULL DEFAULT 'MANUAL',
  min_rest_hours INT NOT NULL DEFAULT 48,
  required_grades JSON NULL,
  min_history_matches INT NOT NULL DEFAULT 0,
  max_distance_km INT NULL,
  version INT NOT NULL DEFAULT 1,
  updated_by VARCHAR(191) NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT chk_ms_designation_policy_rest CHECK (min_rest_hours >= 0),
  CONSTRAINT chk_ms_designation_policy_history CHECK (min_history_matches >= 0),
  CONSTRAINT chk_ms_designation_policy_distance CHECK (max_distance_km IS NULL OR max_distance_km >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

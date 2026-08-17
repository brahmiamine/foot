-- MATCH-001/MATCH-003 — protocole opérationnel configurable par édition de compétition.
-- `saisons` est le référentiel partagé des éditions championnat/coupe/tournoi.
-- Match Operations reste propriétaire de ces règles et les expose aux autres
-- domaines via son API interne service-to-service.

CREATE TABLE IF NOT EXISTS ms_competition_match_protocols (
  id BIGINT NOT NULL AUTO_INCREMENT,
  season_id CHAR(36) NOT NULL,
  pre_match_signing_deadline_minutes INT NULL,
  max_bench_players INT NULL,
  max_substitutions INT NULL,
  require_home_signature TINYINT(1) NOT NULL DEFAULT 1,
  require_away_signature TINYINT(1) NOT NULL DEFAULT 1,
  require_referee_signature TINYINT(1) NOT NULL DEFAULT 1,
  require_center_referee TINYINT(1) NOT NULL DEFAULT 0,
  required_assistant_referees INT NOT NULL DEFAULT 0,
  require_fourth_official TINYINT(1) NOT NULL DEFAULT 0,
  require_match_delegate TINYINT(1) NOT NULL DEFAULT 0,
  require_referee_observer TINYINT(1) NOT NULL DEFAULT 0,
  post_signature_correction_window_minutes INT NULL,
  post_signature_federation_approval_required TINYINT(1) NOT NULL DEFAULT 0,
  version INT NOT NULL DEFAULT 1,
  updated_by VARCHAR(191) NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uniq_ms_competition_protocol_season (season_id),
  CONSTRAINT fk_ms_competition_protocol_season
    FOREIGN KEY (season_id) REFERENCES saisons(id) ON DELETE CASCADE,
  CONSTRAINT chk_ms_protocol_deadline CHECK (pre_match_signing_deadline_minutes IS NULL OR pre_match_signing_deadline_minutes >= 0),
  CONSTRAINT chk_ms_protocol_bench CHECK (max_bench_players IS NULL OR max_bench_players >= 0),
  CONSTRAINT chk_ms_protocol_substitutions CHECK (max_substitutions IS NULL OR max_substitutions >= 0),
  CONSTRAINT chk_ms_protocol_assistants CHECK (required_assistant_referees BETWEEN 0 AND 4),
  CONSTRAINT chk_ms_protocol_post_signature_window CHECK (post_signature_correction_window_minutes IS NULL OR post_signature_correction_window_minutes >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- TASK-P0-009 : workflow de correction des événements de match — remplace
-- la suppression silencieuse d'un but/blessure/remplacement par une
-- annulation traçable (colonnes cancelled_at/cancelled_reason sur chaque
-- table d'événement) et journalise toute correction/annulation (valeur
-- avant/après, auteur, motif, date) dans une table d'audit dédiée.
-- `Card` (carton) est volontairement hors périmètre : table partagée avec
-- club-hub (voir db/OWNERSHIP.md, « Card a deux écrivains »), sa
-- sémantique de suppression ne peut pas être changée unilatéralement.
-- Additive uniquement : nouvelles colonnes nullable, nouvelle table.

USE foot;

ALTER TABLE ms_goals
  ADD COLUMN cancelled_at DATETIME NULL AFTER created_at,
  ADD COLUMN cancelled_reason TEXT NULL AFTER cancelled_at;

ALTER TABLE ms_injuries
  ADD COLUMN cancelled_at DATETIME NULL AFTER created_at,
  ADD COLUMN cancelled_reason TEXT NULL AFTER cancelled_at;

ALTER TABLE ms_substitutions
  ADD COLUMN cancelled_at DATETIME NULL AFTER created_at,
  ADD COLUMN cancelled_reason TEXT NULL AFTER cancelled_at;

CREATE TABLE IF NOT EXISTS ms_event_corrections (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  sheet_id BIGINT NOT NULL,
  match_id CHAR(36) NOT NULL,
  event_type ENUM('GOAL', 'INJURY', 'SUBSTITUTION') NOT NULL,
  event_id BIGINT NOT NULL,
  action ENUM('CORRECTED', 'CANCELLED') NOT NULL,
  before_value TEXT NOT NULL,
  after_value TEXT NULL,
  reason TEXT NOT NULL,
  actor_user_id VARCHAR(36) NULL,
  actor_name VARCHAR(191) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_ms_event_corrections_sheet_id (sheet_id),
  INDEX idx_ms_event_corrections_match_id (match_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

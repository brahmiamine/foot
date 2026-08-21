-- REF-007 — versionnement du barème d'évaluation officielle des arbitres
-- (criteriaVersion + scope saison/compétition + non-rétroactivité).
-- `official_referee_criteria` devient append-only : chaque modification
-- clôture la version en vigueur (effective_until) et insère la suivante au
-- lieu de muter en place. Les évaluations déjà écrites continuent de
-- résoudre le barème actif à `criteria_effective_at`, jamais le dernier en
-- date.
USE foot;

ALTER TABLE official_referee_criteria
  ADD COLUMN IF NOT EXISTS version INT NOT NULL DEFAULT 1 AFTER id,
  ADD COLUMN IF NOT EXISTS season_id CHAR(36) NULL AFTER version,
  ADD COLUMN IF NOT EXISTS competition_id CHAR(36) NULL AFTER season_id,
  ADD COLUMN IF NOT EXISTS effective_from DATETIME NULL AFTER competition_id,
  ADD COLUMN IF NOT EXISTS effective_until DATETIME NULL AFTER effective_from;

UPDATE official_referee_criteria
SET effective_from = COALESCE(effective_from, created_at, CURRENT_TIMESTAMP)
WHERE effective_from IS NULL;

ALTER TABLE official_referee_criteria
  MODIFY COLUMN effective_from DATETIME NOT NULL,
  DROP PRIMARY KEY,
  ADD PRIMARY KEY (id, version),
  ADD INDEX idx_official_criteria_resolution (id, effective_from, effective_until),
  ADD INDEX idx_official_criteria_scope (season_id, competition_id);

ALTER TABLE referee_official_evaluations
  ADD COLUMN IF NOT EXISTS criteria_effective_at DATETIME NULL AFTER criteres;

UPDATE referee_official_evaluations
SET criteria_effective_at = COALESCE(criteria_effective_at, created_at, CURRENT_TIMESTAMP)
WHERE criteria_effective_at IS NULL;

ALTER TABLE referee_official_evaluations
  MODIFY COLUMN criteria_effective_at DATETIME NOT NULL;

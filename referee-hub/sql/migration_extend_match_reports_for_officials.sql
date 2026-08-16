-- Étend les rapports privés de referee-hub aux commissaires de match et
-- observateurs d'arbitres. Le type est dérivé de l'affectation officielle,
-- jamais choisi librement par le navigateur.

USE foot;

ALTER TABLE referee_match_reports
  ADD COLUMN IF NOT EXISTS report_type ENUM('REFEREE_COMPLEMENTARY', 'MATCH_DELEGATE', 'REFEREE_OBSERVER')
    NOT NULL DEFAULT 'REFEREE_COMPLEMENTARY' AFTER role,
  ADD COLUMN IF NOT EXISTS category ENUM('GENERAL', 'SECURITY', 'ORGANIZATION', 'DISCIPLINE', 'TECHNICAL', 'OTHER')
    NOT NULL DEFAULT 'GENERAL' AFTER subject;

UPDATE referee_match_reports
SET report_type = CASE
  WHEN role = 'MATCH_DELEGATE' THEN 'MATCH_DELEGATE'
  WHEN role = 'REFEREE_OBSERVER' THEN 'REFEREE_OBSERVER'
  ELSE 'REFEREE_COMPLEMENTARY'
END;

CREATE INDEX IF NOT EXISTS idx_referee_report_type_status
  ON referee_match_reports (report_type, status);

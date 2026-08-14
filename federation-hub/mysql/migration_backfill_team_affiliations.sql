-- Backfill initial federation affiliation for clubs that predate team_affiliations.
-- Idempotent: only inserts when a club has a legacy teams.federation_id and no
-- affiliation row yet. The start date is intentionally conservative: today is
-- used because the legacy schema does not contain a reliable historical start
-- date. Future changes are then tracked normally by team_affiliations.

USE foot;

INSERT INTO team_affiliations (
  id,
  team_id,
  federation_id,
  league_id,
  saison_id,
  status,
  start_date,
  end_date,
  notes,
  created_by,
  created_at,
  updated_at
)
SELECT
  UUID(),
  t.id,
  t.federation_id,
  NULL,
  NULL,
  'ACTIVE',
  CURRENT_DATE,
  NULL,
  'Backfill from legacy teams.federation_id',
  'migration_backfill_team_affiliations',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM teams t
WHERE t.federation_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM team_affiliations ta
    WHERE ta.team_id = t.id
  );

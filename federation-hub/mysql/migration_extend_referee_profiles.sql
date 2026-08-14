-- Profil administratif officiel des arbitres. Additif et sans suppression
-- des données historiques utilisées par ArbiNote.
USE foot;

ALTER TABLE arbitres
  ADD COLUMN IF NOT EXISTS federation_id CHAR(36) NULL,
  ADD COLUMN IF NOT EXISTS league_id CHAR(36) NULL,
  ADD COLUMN IF NOT EXISTS categorie VARCHAR(100) NULL,
  ADD COLUMN IF NOT EXISTS grade VARCHAR(100) NULL,
  ADD COLUMN IF NOT EXISTS status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN IF NOT EXISTS is_active TINYINT(1) NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS start_date DATE NULL;

UPDATE arbitres SET status = 'ACTIVE', is_active = 1 WHERE status IS NULL;

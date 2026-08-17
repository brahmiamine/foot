-- STAFF-001 — workflow de composition proposé par un adjoint et approuvé par le coach.
-- La table reste possédée par club-hub ; staff-hub utilise le même schéma partagé.

ALTER TABLE cms_match_formations
  ADD COLUMN workflow_status ENUM('DRAFT','PROPOSED','APPROVED','LOCKED') NOT NULL DEFAULT 'DRAFT' AFTER is_locked,
  ADD COLUMN proposed_by VARCHAR(191) NULL AFTER workflow_status,
  ADD COLUMN proposed_at DATETIME NULL AFTER proposed_by,
  ADD COLUMN approved_by VARCHAR(191) NULL AFTER proposed_at,
  ADD COLUMN approved_at DATETIME NULL AFTER approved_by,
  ADD COLUMN locked_by VARCHAR(191) NULL AFTER approved_at,
  ADD COLUMN locked_at DATETIME NULL AFTER locked_by,
  ADD COLUMN workflow_version INT NOT NULL DEFAULT 1 AFTER locked_at;

UPDATE cms_match_formations
SET workflow_status = CASE WHEN is_locked = 1 THEN 'LOCKED' ELSE 'DRAFT' END,
    workflow_version = 1
WHERE workflow_status = 'DRAFT';

-- Les presets corrigent les nouveaux clubs ; ce backfill aligne aussi les
-- rôles système déjà présents sans retirer leurs permissions existantes.
UPDATE cms_roles
SET permissions = JSON_ARRAY_APPEND(permissions, '$', 'lineups.edit')
WHERE is_system = 1
  AND name = 'Adjoint'
  AND JSON_CONTAINS(permissions, JSON_QUOTE('lineups.edit'), '$') = 0;

UPDATE cms_roles
SET permissions = JSON_ARRAY_APPEND(permissions, '$', 'lineups.propose')
WHERE is_system = 1
  AND name IN ('Coach', 'Adjoint', 'Secrétaire Général')
  AND JSON_CONTAINS(permissions, JSON_QUOTE('lineups.propose'), '$') = 0;

UPDATE cms_roles
SET permissions = JSON_ARRAY_APPEND(permissions, '$', 'lineups.approve')
WHERE is_system = 1
  AND name IN ('Coach', 'Secrétaire Général')
  AND JSON_CONTAINS(permissions, JSON_QUOTE('lineups.approve'), '$') = 0;

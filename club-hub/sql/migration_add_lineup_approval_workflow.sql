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

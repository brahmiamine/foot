-- GOV-004 — conserve chaque version de policy MFA et permet une activation
-- temporelle sans écraser la version précédente.
--
-- Les lignes historiques existantes prennent `updated_at` comme début d'effet
-- afin de préserver leur date d'entrée en vigueur au mieux.

ALTER TABLE identity_mfa_role_policies
  ADD COLUMN id CHAR(36) NULL FIRST,
  ADD COLUMN effective_from DATETIME NULL AFTER version,
  ADD COLUMN effective_until DATETIME NULL AFTER effective_from,
  ADD COLUMN created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER updated_by;

UPDATE identity_mfa_role_policies
SET id = UUID(),
    effective_from = COALESCE(effective_from, updated_at)
WHERE id IS NULL;

ALTER TABLE identity_mfa_role_policies
  DROP PRIMARY KEY,
  MODIFY COLUMN id CHAR(36) NOT NULL,
  ADD PRIMARY KEY (id),
  ADD UNIQUE KEY uq_identity_mfa_role_policy_version (role, version),
  ADD INDEX idx_identity_mfa_role_policy_active (role, effective_from, effective_until, version);
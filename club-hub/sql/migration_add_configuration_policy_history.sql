-- GOV-004 / GOV-005 — temporal public configuration history + standard audit.

-- Public form settings used to be one mutable row per (club, domain).
-- Preserve the existing row as version history and use its last update time
-- as the best available activation timestamp.
ALTER TABLE cms_public_form_settings
  ADD COLUMN effective_from DATETIME NULL AFTER version,
  ADD COLUMN effective_until DATETIME NULL AFTER effective_from;

UPDATE cms_public_form_settings
SET effective_from = COALESCE(effective_from, updated_at)
WHERE effective_from IS NULL;

ALTER TABLE cms_public_form_settings
  DROP INDEX uq_public_form_settings_team_domain,
  ADD UNIQUE KEY uq_public_form_settings_version (team_id, domain, version),
  ADD INDEX idx_public_form_settings_resolution (team_id, domain, effective_from, effective_until, version);

-- Shared append-only configuration audit for Club Hub policy/settings domains.
CREATE TABLE cms_configuration_audit (
  id CHAR(36) NOT NULL PRIMARY KEY,
  domain VARCHAR(80) NOT NULL,
  configuration_key VARCHAR(120) NOT NULL,
  scope_type VARCHAR(50) NOT NULL,
  scope_id VARCHAR(191) NULL,
  previous_version INT NULL,
  new_version INT NOT NULL,
  before_value JSON NULL,
  after_value JSON NOT NULL,
  actor_user_id VARCHAR(191) NOT NULL,
  actor_role VARCHAR(80) NOT NULL,
  reason TEXT NOT NULL,
  ip_address VARCHAR(45) NULL,
  user_agent VARCHAR(512) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_configuration_audit_domain (domain),
  INDEX idx_configuration_audit_key (configuration_key),
  INDEX idx_configuration_audit_scope (scope_type, scope_id),
  INDEX idx_configuration_audit_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
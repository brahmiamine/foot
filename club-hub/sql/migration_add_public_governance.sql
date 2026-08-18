-- OB-002/OB-001/OB-004 — membership club, paramètres des formulaires publics
-- et policy de contenu public (sections activables, bannière d'urgence).
-- Tables propres à club-hub, aucune dépendance.

CREATE TABLE IF NOT EXISTS cms_membership_types (
  id CHAR(36) NOT NULL PRIMARY KEY,
  team_id CHAR(36) NOT NULL,
  code ENUM('FAN','SOCIO','VIP','SUPPORTER','PARTNER') NOT NULL,
  label_fr VARCHAR(120) NOT NULL,
  label_ar VARCHAR(120) NULL,
  is_active TINYINT NOT NULL DEFAULT 1,
  requires_approval TINYINT NOT NULL DEFAULT 0,
  duration_days INT NULL,
  rights JSON NULL,
  version INT NOT NULL DEFAULT 1,
  updated_by VARCHAR(191) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_membership_type_team_code (team_id, code),
  CONSTRAINT fk_membership_type_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS cms_memberships (
  id CHAR(36) NOT NULL PRIMARY KEY,
  team_id CHAR(36) NOT NULL,
  user_id VARCHAR(191) NOT NULL,
  membership_type_id CHAR(36) NOT NULL,
  status ENUM('SUBMITTED','ACTIVE','REJECTED','EXPIRED','CANCELLED') NOT NULL DEFAULT 'SUBMITTED',
  approved_at DATETIME NULL,
  approved_by VARCHAR(191) NULL,
  rejection_reason TEXT NULL,
  expires_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_memberships_team_user_status (team_id, user_id, status),
  CONSTRAINT fk_membership_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
  CONSTRAINT fk_membership_type FOREIGN KEY (membership_type_id) REFERENCES cms_membership_types(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS cms_public_form_settings (
  id CHAR(36) NOT NULL PRIMARY KEY,
  team_id CHAR(36) NOT NULL,
  domain ENUM('ACADEMY','RECRUITMENT','SPONSOR','SELLER','CONTACT') NOT NULL,
  is_open TINYINT NOT NULL DEFAULT 1,
  opens_at DATETIME NULL,
  closes_at DATETIME NULL,
  rate_limit_max INT NULL,
  rate_limit_window_minutes INT NULL,
  version INT NOT NULL DEFAULT 1,
  updated_by VARCHAR(191) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_public_form_settings_team_domain (team_id, domain),
  CONSTRAINT fk_public_form_settings_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- OB-004 : policy versionnée (GOV-001 resolvePolicy), portée PLATFORM ou
-- CLUB. `sections`/`emergency_banner` sont des blobs JSON partiels (§values
-- de PolicyRecord) : NULL = hérite de la portée moins spécifique.
CREATE TABLE IF NOT EXISTS cms_public_content_policies (
  id CHAR(36) NOT NULL PRIMARY KEY,
  scope_type ENUM('PLATFORM','CLUB') NOT NULL,
  scope_id CHAR(36) NULL,
  version INT NOT NULL,
  effective_from DATETIME NULL,
  effective_until DATETIME NULL,
  sections JSON NULL,
  emergency_banner JSON NULL,
  updated_by VARCHAR(191) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_public_content_policies_scope (scope_type, scope_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

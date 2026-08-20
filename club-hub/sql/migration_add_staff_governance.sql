-- STAFF-002 à STAFF-005 — gouvernance staff-hub (verrouillage composition,
-- validation des plans d'entraînement, revue/verrouillage des statistiques
-- post-match, délégation temporaire de fonctions d'entraîneur principal).
--
-- Toutes les nouvelles tables sont préfixées `cms_` et scopées `team_id`,
-- suivant la convention de migration_add_roles_scheduling_and_formations.sql.
-- Les politiques versionnées réutilisent le même schéma que
-- cms_feature_settings (GOV-010) et journalisent dans cms_configuration_audit
-- (GOV-005, déjà créée par migration_add_configuration_policy_history.sql).
-- L'absence de ligne de policy préserve systématiquement le comportement
-- historique (pas de verrouillage automatique, pas d'approbation requise).

USE foot;

-- ---------------------------------------------------------------------
-- STAFF-002 : verrouillage automatique de la composition avant coup d'envoi.
-- ---------------------------------------------------------------------
CREATE TABLE cms_lineup_lock_policies (
  id CHAR(36) NOT NULL,
  team_id CHAR(36) NOT NULL,
  enabled TINYINT(1) NOT NULL DEFAULT 0,
  lock_minutes_before_kickoff INT NOT NULL DEFAULT 60,
  version INT NOT NULL DEFAULT 1,
  effective_from DATETIME NULL,
  effective_until DATETIME NULL,
  updated_by VARCHAR(191) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT uq_cms_lineup_lock_policies_version UNIQUE (team_id, version),
  CONSTRAINT fk_cms_lineup_lock_policies_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
  INDEX idx_cms_lineup_lock_policies_resolution (team_id, effective_from, effective_until, version)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- STAFF-003 : validation optionnelle des plans d'entraînement.
-- ---------------------------------------------------------------------
CREATE TABLE cms_training_approval_policies (
  id CHAR(36) NOT NULL,
  team_id CHAR(36) NOT NULL,
  approval_required TINYINT(1) NOT NULL DEFAULT 0,
  version INT NOT NULL DEFAULT 1,
  effective_from DATETIME NULL,
  effective_until DATETIME NULL,
  updated_by VARCHAR(191) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT uq_cms_training_approval_policies_version UNIQUE (team_id, version),
  CONSTRAINT fk_cms_training_approval_policies_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
  INDEX idx_cms_training_approval_policies_resolution (team_id, effective_from, effective_until, version)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- `plan_status` defaults to APPROVED so every training created before this
-- migration (or while the policy above is disabled) stays immediately usable.
ALTER TABLE cms_trainings
  ADD COLUMN plan_status ENUM('DRAFT', 'SUBMITTED', 'APPROVED') NOT NULL DEFAULT 'APPROVED' AFTER status,
  ADD COLUMN submitted_by VARCHAR(191) NULL AFTER plan_status,
  ADD COLUMN submitted_at DATETIME NULL AFTER submitted_by,
  ADD COLUMN approved_by VARCHAR(191) NULL AFTER submitted_at,
  ADD COLUMN approved_at DATETIME NULL AFTER approved_by;

-- ---------------------------------------------------------------------
-- STAFF-004 : fenêtre de revue post-match puis verrouillage des statistiques,
-- avec correction possible après verrouillage à condition d'être auditée.
-- ---------------------------------------------------------------------
CREATE TABLE cms_stat_review_policies (
  id CHAR(36) NOT NULL,
  team_id CHAR(36) NOT NULL,
  review_window_hours INT NOT NULL DEFAULT 72,
  version INT NOT NULL DEFAULT 1,
  effective_from DATETIME NULL,
  effective_until DATETIME NULL,
  updated_by VARCHAR(191) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT uq_cms_stat_review_policies_version UNIQUE (team_id, version),
  CONSTRAINT fk_cms_stat_review_policies_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
  INDEX idx_cms_stat_review_policies_resolution (team_id, effective_from, effective_until, version)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- `updated_at` existe déjà (migration_add_player_stats.sql) : seules
-- locked_at/locked_by sont nouvelles ici.
ALTER TABLE cms_player_stats
  ADD COLUMN locked_at DATETIME NULL AFTER trainings_total,
  ADD COLUMN locked_by VARCHAR(191) NULL AFTER locked_at;

-- ---------------------------------------------------------------------
-- STAFF-005 : délégation temporaire des fonctions d'entraîneur principal,
-- bornée à un seul match OU à une période, jamais les deux — et réservée à
-- un membre du staff qualifié (cms_staff.staff_type), pas à n'importe quel
-- compte club. Table dédiée (distincte de cms_role_delegations/CLUB-012,
-- générique) car elle porte une contrainte métier propre : le contrôle de
-- qualification du délégataire et la portée "un seul match".
-- ---------------------------------------------------------------------
CREATE TABLE cms_head_coach_delegations (
  id CHAR(36) NOT NULL,
  team_id CHAR(36) NOT NULL,
  delegator_user_id VARCHAR(191) NOT NULL,
  delegatee_user_id VARCHAR(191) NOT NULL,
  delegatee_staff_id BIGINT NOT NULL,
  match_id CHAR(36) NULL,
  friendly_match_id BIGINT NULL,
  valid_from DATETIME NULL,
  valid_until DATETIME NULL,
  reason TEXT NOT NULL,
  revoked_at DATETIME NULL,
  revoked_by VARCHAR(191) NULL,
  revocation_reason TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_cms_head_coach_delegations_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
  CONSTRAINT fk_cms_head_coach_delegations_staff FOREIGN KEY (delegatee_staff_id) REFERENCES cms_staff(id) ON DELETE CASCADE,
  INDEX idx_cms_head_coach_delegations_team_delegatee (team_id, delegatee_user_id),
  INDEX idx_cms_head_coach_delegations_match (team_id, match_id),
  INDEX idx_cms_head_coach_delegations_friendly (team_id, friendly_match_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

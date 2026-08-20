-- CLUB-006 — workflow enrichi des candidatures académie.
--
-- Le workflow historique NEW -> CONTACTED -> TRIAL -> ACCEPTED/REJECTED est
-- remplacé par des étapes explicites et auditables côté application :
-- NEW -> PRE_SCREENED -> TRIAL_SCHEDULED -> TECHNICAL_APPROVED ->
-- ADMIN_APPROVED -> PLAYER_CREATED, avec REJECTED avant validation finale.
--
-- Les anciennes lignes sont grandfathered sans suppression : CONTACTED devient
-- PRE_SCREENED, TRIAL devient TRIAL_SCHEDULED et ACCEPTED devient
-- ADMIN_APPROVED. Elles peuvent ainsi poursuivre le nouveau parcours sans
-- prétendre qu'un Player a déjà été créé.

USE foot;

ALTER TABLE cms_player_applications
  MODIFY COLUMN status ENUM(
    'NEW','CONTACTED','TRIAL','ACCEPTED','REJECTED',
    'PRE_SCREENED','TRIAL_SCHEDULED','TECHNICAL_APPROVED','ADMIN_APPROVED','PLAYER_CREATED'
  ) NOT NULL DEFAULT 'NEW';

UPDATE cms_player_applications SET status = 'PRE_SCREENED' WHERE status = 'CONTACTED';
UPDATE cms_player_applications SET status = 'TRIAL_SCHEDULED' WHERE status = 'TRIAL';
UPDATE cms_player_applications SET status = 'ADMIN_APPROVED' WHERE status = 'ACCEPTED';

ALTER TABLE cms_player_applications
  MODIFY COLUMN status ENUM(
    'NEW','PRE_SCREENED','TRIAL_SCHEDULED','TECHNICAL_APPROVED','ADMIN_APPROVED','PLAYER_CREATED','REJECTED'
  ) NOT NULL DEFAULT 'NEW',
  ADD COLUMN pre_screening_notes TEXT NULL AFTER admin_notes,
  ADD COLUMN pre_screened_at DATETIME NULL AFTER pre_screening_notes,
  ADD COLUMN pre_screened_by VARCHAR(191) NULL AFTER pre_screened_at,
  ADD COLUMN trial_scheduled_at DATETIME NULL AFTER pre_screened_by,
  ADD COLUMN trial_location VARCHAR(191) NULL AFTER trial_scheduled_at,
  ADD COLUMN trial_notes TEXT NULL AFTER trial_location,
  ADD COLUMN technical_approved_at DATETIME NULL AFTER trial_notes,
  ADD COLUMN technical_approved_by VARCHAR(191) NULL AFTER technical_approved_at,
  ADD COLUMN technical_notes TEXT NULL AFTER technical_approved_by,
  ADD COLUMN administrative_approved_at DATETIME NULL AFTER technical_notes,
  ADD COLUMN administrative_approved_by VARCHAR(191) NULL AFTER administrative_approved_at,
  ADD COLUMN administrative_notes TEXT NULL AFTER administrative_approved_by,
  ADD COLUMN rejected_at DATETIME NULL AFTER administrative_notes,
  ADD COLUMN rejected_by VARCHAR(191) NULL AFTER rejected_at,
  ADD COLUMN rejection_reason TEXT NULL AFTER rejected_by,
  ADD COLUMN player_id VARCHAR(191) NULL AFTER rejection_reason,
  ADD COLUMN player_created_at DATETIME NULL AFTER player_id,
  ADD COLUMN player_created_by VARCHAR(191) NULL AFTER player_created_at,
  ADD CONSTRAINT uq_cms_player_applications_player UNIQUE (player_id),
  ADD CONSTRAINT fk_cms_player_applications_player
    FOREIGN KEY (player_id) REFERENCES Player(id) ON DELETE SET NULL;

CREATE TABLE cms_player_application_events (
  id CHAR(36) PRIMARY KEY,
  team_id CHAR(36) NOT NULL,
  application_id BIGINT NOT NULL,
  actor_id VARCHAR(191) NOT NULL,
  event_type VARCHAR(40) NOT NULL,
  from_status VARCHAR(40) NOT NULL,
  to_status VARCHAR(40) NOT NULL,
  details_json LONGTEXT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_cms_player_application_events_team
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
  CONSTRAINT fk_cms_player_application_events_application
    FOREIGN KEY (application_id) REFERENCES cms_player_applications(id) ON DELETE CASCADE,
  INDEX idx_cms_player_application_events_team_app (team_id, application_id, created_at),
  INDEX idx_cms_player_application_events_actor (actor_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

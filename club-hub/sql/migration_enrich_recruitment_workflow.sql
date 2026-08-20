-- CLUB-007 — workflow enrichi du recrutement.
--
-- Le parcours libre historique NEW/CONTACTED/TRIAL/ACCEPTED/REJECTED devient
-- une machine d'état explicite :
-- NEW -> SCOUT_APPROVED -> COACH_APPROVED -> TRIAL_SCHEDULED ->
-- TRIAL_APPROVED -> SPORTING_DIRECTOR_APPROVED -> NEGOTIATION -> ACCEPTED.
-- REJECTED reste terminal et peut intervenir avant ACCEPTED.
--
-- Les anciennes candidatures sont conservées : CONTACTED est repris comme
-- revue scout déjà effectuée, TRIAL comme essai déjà planifié. ACCEPTED et
-- REJECTED restent terminaux sans inventer de validation intermédiaire.

USE foot;

ALTER TABLE cms_recruitment_applications
  MODIFY COLUMN status ENUM(
    'NEW','CONTACTED','TRIAL','ACCEPTED','REJECTED',
    'SCOUT_APPROVED','COACH_APPROVED','TRIAL_SCHEDULED','TRIAL_APPROVED',
    'SPORTING_DIRECTOR_APPROVED','NEGOTIATION'
  ) NOT NULL DEFAULT 'NEW';

UPDATE cms_recruitment_applications SET status = 'SCOUT_APPROVED' WHERE status = 'CONTACTED';
UPDATE cms_recruitment_applications SET status = 'TRIAL_SCHEDULED' WHERE status = 'TRIAL';

ALTER TABLE cms_recruitment_applications
  MODIFY COLUMN status ENUM(
    'NEW','SCOUT_APPROVED','COACH_APPROVED','TRIAL_SCHEDULED','TRIAL_APPROVED',
    'SPORTING_DIRECTOR_APPROVED','NEGOTIATION','ACCEPTED','REJECTED'
  ) NOT NULL DEFAULT 'NEW',
  ADD COLUMN scout_reviewed_at DATETIME NULL AFTER admin_notes,
  ADD COLUMN scout_reviewed_by VARCHAR(191) NULL AFTER scout_reviewed_at,
  ADD COLUMN scout_notes TEXT NULL AFTER scout_reviewed_by,
  ADD COLUMN coach_reviewed_at DATETIME NULL AFTER scout_notes,
  ADD COLUMN coach_reviewed_by VARCHAR(191) NULL AFTER coach_reviewed_at,
  ADD COLUMN coach_notes TEXT NULL AFTER coach_reviewed_by,
  ADD COLUMN trial_scheduled_at DATETIME NULL AFTER coach_notes,
  ADD COLUMN trial_location VARCHAR(191) NULL AFTER trial_scheduled_at,
  ADD COLUMN trial_notes TEXT NULL AFTER trial_location,
  ADD COLUMN trial_approved_at DATETIME NULL AFTER trial_notes,
  ADD COLUMN trial_approved_by VARCHAR(191) NULL AFTER trial_approved_at,
  ADD COLUMN trial_evaluation TEXT NULL AFTER trial_approved_by,
  ADD COLUMN sporting_director_approved_at DATETIME NULL AFTER trial_evaluation,
  ADD COLUMN sporting_director_approved_by VARCHAR(191) NULL AFTER sporting_director_approved_at,
  ADD COLUMN sporting_director_notes TEXT NULL AFTER sporting_director_approved_by,
  ADD COLUMN negotiation_started_at DATETIME NULL AFTER sporting_director_notes,
  ADD COLUMN negotiation_started_by VARCHAR(191) NULL AFTER negotiation_started_at,
  ADD COLUMN negotiation_notes TEXT NULL AFTER negotiation_started_by,
  ADD COLUMN accepted_at DATETIME NULL AFTER negotiation_notes,
  ADD COLUMN accepted_by VARCHAR(191) NULL AFTER accepted_at,
  ADD COLUMN acceptance_notes TEXT NULL AFTER accepted_by,
  ADD COLUMN rejected_at DATETIME NULL AFTER acceptance_notes,
  ADD COLUMN rejected_by VARCHAR(191) NULL AFTER rejected_at,
  ADD COLUMN rejection_reason TEXT NULL AFTER rejected_by;

CREATE TABLE cms_recruitment_application_events (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  team_id CHAR(36) NOT NULL,
  application_id BIGINT NOT NULL,
  actor_id VARCHAR(191) NOT NULL,
  transition VARCHAR(64) NOT NULL,
  from_status VARCHAR(64) NOT NULL,
  to_status VARCHAR(64) NOT NULL,
  details LONGTEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_cms_recruitment_events_team
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
  CONSTRAINT fk_cms_recruitment_events_application
    FOREIGN KEY (application_id) REFERENCES cms_recruitment_applications(id) ON DELETE CASCADE,
  INDEX idx_cms_recruitment_events_application (team_id, application_id, created_at),
  INDEX idx_cms_recruitment_events_actor (team_id, actor_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

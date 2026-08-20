-- CLUB-010 — Entraînements paramétrables
-- Sépare le RSVP joueur du pointage staff, ajoute deadline/verrouillage/rappel
-- et des modèles de séances réutilisables. Migration additive uniquement.

USE foot;

ALTER TABLE cms_trainings
  ADD COLUMN response_deadline DATETIME NULL AFTER date,
  ADD COLUMN invitations_locked TINYINT(1) NOT NULL DEFAULT 0 AFTER response_deadline,
  ADD COLUMN invitations_locked_at DATETIME NULL AFTER invitations_locked,
  ADD COLUMN invitations_locked_by VARCHAR(191) NULL AFTER invitations_locked_at,
  ADD COLUMN reminder_offset_minutes INT NOT NULL DEFAULT 1440 AFTER invitations_locked_by,
  ADD INDEX idx_cms_trainings_rsvp_due (status, response_deadline);

ALTER TABLE cms_training_invitations
  ADD COLUMN rsvp_status ENUM('PENDING', 'ACCEPTED', 'DECLINED') NOT NULL DEFAULT 'PENDING' AFTER responded_at,
  ADD COLUMN rsvp_responded_at DATETIME NULL AFTER rsvp_status,
  ADD COLUMN reminder_sent_at DATETIME NULL AFTER rsvp_responded_at,
  ADD INDEX idx_training_invitation_rsvp (training_id, rsvp_status, reminder_sent_at);

CREATE TABLE cms_training_templates (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  team_id CHAR(36) NOT NULL,
  category VARCHAR(10) NOT NULL DEFAULT 'seniors',
  name VARCHAR(120) NOT NULL,
  title VARCHAR(200) NOT NULL,
  objective VARCHAR(500) NULL,
  training_type ENUM('TECHNIQUE', 'PHYSIQUE', 'TACTIQUE', 'PREPARATION_MATCH', 'RECUPERATION', 'AUTRE') NOT NULL DEFAULT 'AUTRE',
  intensity ENUM('LOW', 'MEDIUM', 'HIGH') NULL,
  duration_minutes INT NULL,
  equipment VARCHAR(500) NULL,
  venue_name VARCHAR(200) NULL,
  notes TEXT NULL,
  response_deadline_offset_minutes INT NOT NULL DEFAULT 1440,
  reminder_offset_minutes INT NOT NULL DEFAULT 1440,
  blocks_json LONGTEXT NOT NULL,
  created_by VARCHAR(191) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_training_templates_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
  INDEX idx_training_templates_team_category (team_id, category),
  INDEX idx_training_templates_team_name (team_id, name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- MED-001..003 — journal médical append-only, Return-to-Play et clearance.
-- Tables cms_* possédées par le domaine Club/Medical dans la base partagée.

ALTER TABLE cms_injuries
  ADD COLUMN rtp_stage ENUM('INJURED','TREATMENT','INDIVIDUAL','PARTIAL','FULL','CLEARANCE','AVAILABLE') NOT NULL DEFAULT 'INJURED' AFTER progressive_return_notes,
  ADD COLUMN rtp_version INT NOT NULL DEFAULT 1 AFTER rtp_stage;

UPDATE cms_injuries
SET rtp_stage = CASE
  WHEN status = 'RESOLVED' THEN 'AVAILABLE'
  WHEN status = 'RECOVERING' THEN 'PARTIAL'
  ELSE 'INJURED'
END,
rtp_version = 1;

CREATE TABLE IF NOT EXISTS cms_medical_settings (
  team_id CHAR(36) NOT NULL PRIMARY KEY,
  clearance_required TINYINT(1) NOT NULL DEFAULT 1,
  severe_second_opinion_required TINYINT(1) NOT NULL DEFAULT 1,
  updated_by VARCHAR(191) NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_cms_medical_settings_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS cms_injury_followups (
  id CHAR(36) NOT NULL PRIMARY KEY,
  injury_id BIGINT NOT NULL,
  team_id CHAR(36) NOT NULL,
  author_user_id VARCHAR(191) NOT NULL,
  entry_type ENUM('NOTE','RTP_TRANSITION','CLEARANCE_DECISION') NOT NULL DEFAULT 'NOTE',
  note TEXT NOT NULL,
  metadata_json JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_cms_injury_followups_injury (team_id, injury_id, created_at),
  CONSTRAINT fk_cms_injury_followups_injury FOREIGN KEY (injury_id) REFERENCES cms_injuries(id) ON DELETE CASCADE,
  CONSTRAINT fk_cms_injury_followups_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS cms_injury_clearances (
  id CHAR(36) NOT NULL PRIMARY KEY,
  injury_id BIGINT NOT NULL,
  team_id CHAR(36) NOT NULL,
  reviewer_user_id VARCHAR(191) NOT NULL,
  decision ENUM('CLEAR','NOT_CLEAR') NOT NULL,
  notes TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_cms_injury_clearances_injury (team_id, injury_id, created_at),
  INDEX idx_cms_injury_clearances_reviewer (reviewer_user_id, created_at),
  CONSTRAINT fk_cms_injury_clearances_injury FOREIGN KEY (injury_id) REFERENCES cms_injuries(id) ON DELETE CASCADE,
  CONSTRAINT fk_cms_injury_clearances_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

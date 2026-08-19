-- ID-004 — policy d'inscription MEMBER par club + workflow email/approval/invitation.
CREATE TABLE IF NOT EXISTS member_registration_policies (
  id CHAR(36) NOT NULL,
  team_id CHAR(36) NOT NULL,
  mode ENUM('OPEN','EMAIL_VERIFICATION','CLUB_APPROVAL','INVITE_ONLY','CLOSED') NOT NULL DEFAULT 'OPEN',
  version INT NOT NULL DEFAULT 1,
  effective_from DATETIME NULL,
  effective_until DATETIME NULL,
  updated_by VARCHAR(191) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT uq_member_registration_policy_version UNIQUE (team_id, version),
  CONSTRAINT fk_member_registration_policy_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
  INDEX idx_member_registration_policy_resolution (team_id, effective_from, effective_until, version)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS member_registration_requests (
  id CHAR(36) NOT NULL,
  team_id CHAR(36) NOT NULL,
  email VARCHAR(191) NOT NULL,
  name VARCHAR(191) NOT NULL,
  first_name VARCHAR(100) NULL,
  last_name VARCHAR(100) NULL,
  phone_number VARCHAR(30) NULL,
  password_hash VARCHAR(191) NULL,
  provider ENUM('PASSWORD','GOOGLE','INVITATION') NOT NULL,
  mode_snapshot ENUM('OPEN','EMAIL_VERIFICATION','CLUB_APPROVAL','INVITE_ONLY','CLOSED') NOT NULL,
  status ENUM('PENDING_EMAIL_VERIFICATION','PENDING_CLUB_APPROVAL','INVITED','COMPLETED','REJECTED','EXPIRED') NOT NULL,
  token_hash VARCHAR(191) NULL,
  expires_at DATETIME NULL,
  user_id VARCHAR(191) NULL,
  reviewed_by_user_id VARCHAR(191) NULL,
  reviewed_at DATETIME NULL,
  rejection_reason TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_member_registration_request_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
  CONSTRAINT fk_member_registration_request_user FOREIGN KEY (user_id) REFERENCES User(id) ON DELETE SET NULL,
  UNIQUE KEY uq_member_registration_request_token (token_hash),
  INDEX idx_member_registration_email (email),
  INDEX idx_member_registration_queue (team_id, status, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

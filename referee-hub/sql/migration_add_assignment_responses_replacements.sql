-- REF-001/REF-002 — acceptation/refus des désignations et demandes de remplacement.
-- Les réponses ne modifient jamais automatiquement match_official_assignments :
-- la Fédération reste propriétaire de l'affectation/revocation effective.

CREATE TABLE IF NOT EXISTS referee_assignment_responses (
  id BIGINT NOT NULL AUTO_INCREMENT,
  assignment_id BIGINT NOT NULL,
  user_id VARCHAR(191) NOT NULL,
  status ENUM('PENDING_ACCEPTANCE','ACCEPTED','DECLINED') NOT NULL DEFAULT 'PENDING_ACCEPTANCE',
  response_deadline DATETIME NOT NULL,
  responded_at DATETIME NULL,
  decline_reason VARCHAR(500) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_referee_assignment_response_assignment (assignment_id),
  KEY idx_referee_assignment_response_user_status (user_id, status, response_deadline),
  CONSTRAINT fk_referee_assignment_response_assignment FOREIGN KEY (assignment_id) REFERENCES match_official_assignments(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE IF NOT EXISTS referee_replacement_requests (
  id BIGINT NOT NULL AUTO_INCREMENT,
  assignment_id BIGINT NOT NULL,
  match_id CHAR(36) NOT NULL,
  user_id VARCHAR(191) NOT NULL,
  reason VARCHAR(500) NOT NULL,
  status ENUM('PENDING','APPROVED','REJECTED','RESOLVED') NOT NULL DEFAULT 'PENDING',
  reviewed_by VARCHAR(191) NULL,
  reviewed_at DATETIME NULL,
  review_note VARCHAR(500) NULL,
  replacement_assignment_id BIGINT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_referee_replacement_user_status (user_id, status, created_at),
  KEY idx_referee_replacement_match_status (match_id, status, created_at),
  KEY idx_referee_replacement_assignment_status (assignment_id, status),
  CONSTRAINT fk_referee_replacement_assignment FOREIGN KEY (assignment_id) REFERENCES match_official_assignments(id) ON DELETE RESTRICT,
  CONSTRAINT fk_referee_replacement_match FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE RESTRICT,
  CONSTRAINT fk_referee_replacement_new_assignment FOREIGN KEY (replacement_assignment_id) REFERENCES match_official_assignments(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

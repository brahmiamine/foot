-- MATCH-002/MATCH-003 — workflow d'amendement d'une feuille post-match signée/clôturée.
-- La feuille conserve son statut signé ; une ligne ouverte autorise uniquement
-- les corrections auditées, puis les nouvelles signatures ferment le workflow.
-- La version du protocole appliqué et la décision Fédération sont historisées.

CREATE TABLE IF NOT EXISTS ms_sheet_amendments (
  id BIGINT NOT NULL AUTO_INCREMENT,
  sheet_id BIGINT NOT NULL,
  match_id CHAR(36) NOT NULL,
  status ENUM('AMENDMENT_REQUESTED','AMENDED','RE_SIGNED') NOT NULL,
  original_sheet_status VARCHAR(32) NOT NULL,
  reason TEXT NOT NULL,
  requested_by_user_id VARCHAR(36) NULL,
  requested_by_name VARCHAR(191) NULL,
  protocol_version_used INT NOT NULL DEFAULT 0,
  approval_status ENUM('NOT_REQUIRED','PENDING','APPROVED','REJECTED') NOT NULL DEFAULT 'NOT_REQUIRED',
  decided_by_user_id VARCHAR(36) NULL,
  decided_by_name VARCHAR(191) NULL,
  decision_reason TEXT NULL,
  decided_at DATETIME NULL,
  requested_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  amended_at DATETIME NULL,
  re_signed_at DATETIME NULL,
  PRIMARY KEY (id),
  KEY idx_ms_sheet_amendments_sheet_status (sheet_id, status),
  KEY idx_ms_sheet_amendments_approval (sheet_id, approval_status),
  KEY idx_ms_sheet_amendments_match (match_id),
  CONSTRAINT fk_ms_sheet_amendments_sheet
    FOREIGN KEY (sheet_id) REFERENCES ms_sheets(id) ON DELETE CASCADE,
  CONSTRAINT fk_ms_sheet_amendments_match
    FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

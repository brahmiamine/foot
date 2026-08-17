-- MATCH-003 — policy de corrections post-signature.
-- Ajoute la fenêtre configurable et l'approbation Fédération au protocole,
-- puis persiste sur chaque amendement la version de policy effectivement
-- appliquée et sa décision d'autorisation.

ALTER TABLE ms_competition_match_protocols
  ADD COLUMN post_signature_correction_window_minutes INT NULL AFTER require_referee_observer,
  ADD COLUMN post_signature_federation_approval_required TINYINT(1) NOT NULL DEFAULT 0 AFTER post_signature_correction_window_minutes,
  ADD CONSTRAINT chk_ms_protocol_post_signature_window
    CHECK (post_signature_correction_window_minutes IS NULL OR post_signature_correction_window_minutes >= 0);

ALTER TABLE ms_sheet_amendments
  ADD COLUMN protocol_version_used INT NOT NULL DEFAULT 0 AFTER requested_by_name,
  ADD COLUMN approval_status ENUM('NOT_REQUIRED','PENDING','APPROVED','REJECTED') NOT NULL DEFAULT 'NOT_REQUIRED' AFTER protocol_version_used,
  ADD COLUMN decided_by_user_id VARCHAR(36) NULL AFTER approval_status,
  ADD COLUMN decided_by_name VARCHAR(191) NULL AFTER decided_by_user_id,
  ADD COLUMN decision_reason TEXT NULL AFTER decided_by_name,
  ADD COLUMN decided_at DATETIME NULL AFTER decision_reason,
  ADD KEY idx_ms_sheet_amendments_approval (sheet_id, approval_status);

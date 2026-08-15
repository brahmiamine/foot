-- migration-v2 P1-007 : une décision disciplinaire individuelle doit produire
-- une vraie suspension consommée par EligibilityService, sans inventer un
-- carton. Extension additive du modèle historique Suspension.
USE foot;

ALTER TABLE Suspension
  MODIFY COLUMN cardId varchar(191) NULL,
  MODIFY COLUMN reason enum('THREE_YELLOWS','CONSECUTIVE_YELLOWS','RED_CARD_1','RED_CARD_2','RED_CARD_3','DISCIPLINARY_DECISION') NOT NULL,
  ADD COLUMN IF NOT EXISTS sourceDisciplinaryCaseId char(36) NULL,
  ADD COLUMN IF NOT EXISTS sourceDisciplinaryDecisionId char(36) NULL,
  ADD COLUMN IF NOT EXISTS sourceReason text NULL;

ALTER TABLE Suspension
  ADD UNIQUE KEY IF NOT EXISTS uq_suspension_disciplinary_decision (sourceDisciplinaryDecisionId),
  ADD KEY IF NOT EXISTS idx_suspension_disciplinary_case (sourceDisciplinaryCaseId);

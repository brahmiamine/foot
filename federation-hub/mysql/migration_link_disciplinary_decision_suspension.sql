USE foot;

ALTER TABLE disciplinary_case_decisions
  ADD COLUMN IF NOT EXISTS suspension_id varchar(191) NULL;

ALTER TABLE disciplinary_case_decisions
  ADD UNIQUE KEY uq_disciplinary_decision_suspension (suspension_id);

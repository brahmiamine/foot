-- FED-006 (platform-governance-roadmap.md, section N) : une saison/compétition
-- peut désormais exiger une assurance club active avant l'approbation d'un
-- engagement, au même titre que requires_stadium_approval /
-- requires_financial_compliance (voir migration_add_competition_entries_transfer_windows_eligibility.sql).
-- Enforcement serveur : federation-hub/src/lib/competitionRegistrations.ts
-- (assertRealApprovalPrerequisites).

ALTER TABLE saisons
  ADD COLUMN IF NOT EXISTS requires_insurance TINYINT(1) NOT NULL DEFAULT 0;

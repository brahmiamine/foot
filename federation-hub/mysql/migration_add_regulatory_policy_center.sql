-- FED-001/FED-002/FED-003/FED-004 (platform-governance-roadmap.md, section N) :
-- Regulatory Policy Center — politiques réglementaires hiérarchiques
-- (PLATFORM -> FEDERATION -> LEAGUE -> SEASON, une "saison" = une édition de
-- compétition dans ce schéma) résolues via le contrat partagé
-- @foot/domain-contracts/policy (GOV-001). Porte aussi :
--   - FED-002/003 : catégories de templates documentaires supplémentaires
--     (contrat/médical) et exigence de signature/méthode de vérification sur
--     regulatory_document_requirements, capture de signature sur
--     regulatory_document_submissions ;
--   - FED-004 : les délégations fédération -> ligue par opération sont
--     stockées comme une valeur de policy (delegatedOperations) au lieu d'une
--     table dédiée, pour hériter gratuitement du versionnement/audit/motif.
-- Dépend de federation-hub/mysql/migration_add_federal_operations_v3.sql
-- (regulatory_document_requirements, regulatory_document_submissions,
-- federal_commission_decisions, federal_operation_audit).

CREATE TABLE IF NOT EXISTS federal_regulatory_policies (
  id CHAR(36) NOT NULL PRIMARY KEY,
  scope_type ENUM('PLATFORM','FEDERATION','LEAGUE','SEASON') NOT NULL,
  scope_id CHAR(36) NULL,
  federation_id CHAR(36) NOT NULL,
  league_id CHAR(36) NULL,
  version INT NOT NULL DEFAULT 1,
  effective_from DATETIME NOT NULL,
  effective_until DATETIME NULL,
  values_json JSON NOT NULL,
  reason VARCHAR(1000) NOT NULL,
  created_by VARCHAR(191) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_regulatory_policy_scope_version (scope_type, scope_id, version),
  KEY idx_regulatory_policy_scope (federation_id, league_id, scope_type, scope_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE regulatory_document_requirements
  MODIFY COLUMN domain ENUM('CLUB_LICENSE','COMPETITION_ENTRY','FINANCIAL_COMPLIANCE','INSURANCE','GRANT','COACH_LICENSE','STADIUM','GOVERNANCE','CONTRACT','MEDICAL','OTHER') NOT NULL,
  ADD COLUMN IF NOT EXISTS signature_required TINYINT(1) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS verification_method ENUM('NONE','MANUAL_REVIEW','FEDERATION_SIGNATURE','THIRD_PARTY') NOT NULL DEFAULT 'MANUAL_REVIEW';

ALTER TABLE regulatory_document_submissions
  ADD COLUMN IF NOT EXISTS signed_at DATETIME NULL,
  ADD COLUMN IF NOT EXISTS signed_by VARCHAR(191) NULL;

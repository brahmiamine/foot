-- FED-010 (platform-governance-roadmap.md, section N) : paramètres de SLA
-- réglementaire par domaine (délai d'alerte / délai de dépassement) et file
-- d'attente en retard calculée à la volée sur les dossiers déjà en attente
-- (regulatory_document_submissions, club_license_applications,
-- disciplinary_cases, appeals, club_insurance_policies/person_insurance_policies,
-- grant_applications). Pas de moteur de rappels/escalade planifié ici — ce
-- socle générique (GOV-008) reste à construire ; ce lot livre la
-- configuration et la visibilité "file overdue" demandées par le critère de
-- fin de FED-010.

CREATE TABLE IF NOT EXISTS regulatory_sla_policies (
  id CHAR(36) NOT NULL PRIMARY KEY,
  federation_id CHAR(36) NOT NULL,
  domain ENUM('CLUB_LICENSE','COMPETITION_ENTRY','DISCIPLINE','APPEAL','INSURANCE','GRANT','DOCUMENT_COMPLIANCE') NOT NULL,
  warn_after_hours INT NOT NULL,
  overdue_after_hours INT NOT NULL,
  updated_by VARCHAR(191) NOT NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_regulatory_sla_policy_domain (federation_id, domain)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

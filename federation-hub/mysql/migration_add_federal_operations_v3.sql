-- Federal Operations V3
-- Commissions, annual regulatory extensions, insurance, grants, broadcasting,
-- training compensation, solidarity, document control and national teams.
-- Additive migration only. External payment/TMS systems are deliberately not
-- emulated here: we persist references/statuses and keep the regulatory source
-- of truth inside federation-hub.

CREATE TABLE IF NOT EXISTS federal_commissions (
  id CHAR(36) NOT NULL PRIMARY KEY,
  federation_id CHAR(36) NOT NULL,
  league_id CHAR(36) NULL,
  code VARCHAR(80) NOT NULL,
  name VARCHAR(191) NOT NULL,
  commission_type ENUM('DISCIPLINE','APPEALS','LEGAL_DISPUTES','CLUB_LICENSING','FINANCIAL_CONTROL','COMPETITIONS','OTHER') NOT NULL,
  status ENUM('ACTIVE','SUSPENDED','ARCHIVED') NOT NULL DEFAULT 'ACTIVE',
  quorum_rule ENUM('ABSOLUTE_MAJORITY','TWO_THIRDS','FIXED') NOT NULL DEFAULT 'ABSOLUTE_MAJORITY',
  fixed_quorum INT NULL,
  created_by VARCHAR(191) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_federal_commission_code (federation_id, code),
  KEY idx_federal_commissions_scope (federation_id, league_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS federal_commission_members (
  id CHAR(36) NOT NULL PRIMARY KEY,
  commission_id CHAR(36) NOT NULL,
  user_id VARCHAR(191) NOT NULL,
  member_role ENUM('PRESIDENT','VICE_PRESIDENT','RAPPORTEUR','MEMBER','SECRETARY') NOT NULL DEFAULT 'MEMBER',
  voting TINYINT(1) NOT NULL DEFAULT 1,
  active TINYINT(1) NOT NULL DEFAULT 1,
  appointed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ended_at DATETIME NULL,
  created_by VARCHAR(191) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_federal_commission_member (commission_id, user_id),
  KEY idx_federal_commission_members_active (commission_id, active, voting)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS federal_commission_sessions (
  id CHAR(36) NOT NULL PRIMARY KEY,
  commission_id CHAR(36) NOT NULL,
  season_id CHAR(36) NULL,
  title VARCHAR(191) NOT NULL,
  scheduled_at DATETIME NOT NULL,
  status ENUM('DRAFT','CONVENED','IN_SESSION','DELIBERATION','CLOSED','CANCELLED') NOT NULL DEFAULT 'DRAFT',
  agenda JSON NULL,
  required_quorum INT NOT NULL DEFAULT 1,
  present_voters INT NOT NULL DEFAULT 0,
  quorum_met TINYINT(1) NOT NULL DEFAULT 0,
  started_at DATETIME NULL,
  closed_at DATETIME NULL,
  created_by VARCHAR(191) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_federal_commission_sessions (commission_id, scheduled_at, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS federal_commission_attendance (
  id CHAR(36) NOT NULL PRIMARY KEY,
  session_id CHAR(36) NOT NULL,
  member_id CHAR(36) NOT NULL,
  attendance_status ENUM('INVITED','PRESENT','ABSENT','EXCUSED') NOT NULL DEFAULT 'INVITED',
  checked_in_at DATETIME NULL,
  recorded_by VARCHAR(191) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_federal_commission_attendance (session_id, member_id),
  KEY idx_federal_commission_attendance_status (session_id, attendance_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS federal_commission_decisions (
  id CHAR(36) NOT NULL PRIMARY KEY,
  session_id CHAR(36) NOT NULL,
  commission_id CHAR(36) NOT NULL,
  source_type ENUM('LEGAL_CASE','DISCIPLINARY_CASE','APPEAL','CLUB_LICENSE','FINANCIAL_COMPLIANCE','COMPETITION','OTHER') NOT NULL,
  source_id VARCHAR(191) NOT NULL,
  decision_number VARCHAR(100) NOT NULL,
  summary TEXT NOT NULL,
  regulatory_basis TEXT NULL,
  outcome JSON NULL,
  decided_at DATETIME NOT NULL,
  signed_at DATETIME NULL,
  signed_by VARCHAR(191) NULL,
  notified_at DATETIME NULL,
  appeal_deadline DATETIME NULL,
  created_by VARCHAR(191) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_federal_commission_decision_number (decision_number),
  KEY idx_federal_commission_decision_source (source_type, source_id),
  KEY idx_federal_commission_decision_session (session_id, commission_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS federal_operation_audit (
  id CHAR(36) NOT NULL PRIMARY KEY,
  domain VARCHAR(80) NOT NULL,
  entity_id VARCHAR(191) NOT NULL,
  action VARCHAR(100) NOT NULL,
  actor_user_id VARCHAR(191) NOT NULL,
  actor_role VARCHAR(50) NOT NULL,
  reason TEXT NULL,
  before_value JSON NULL,
  after_value JSON NULL,
  ip_address VARCHAR(45) NULL,
  user_agent VARCHAR(512) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_federal_operation_audit_entity (domain, entity_id, created_at),
  KEY idx_federal_operation_audit_actor (actor_user_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS club_insurance_policies (
  id CHAR(36) NOT NULL PRIMARY KEY,
  federation_id CHAR(36) NOT NULL,
  league_id CHAR(36) NULL,
  season_id CHAR(36) NOT NULL,
  club_id CHAR(36) NOT NULL,
  policy_number VARCHAR(120) NOT NULL,
  provider VARCHAR(191) NOT NULL,
  coverage_type ENUM('CLUB','PLAYERS','STAFF','MATCHDAY','OTHER') NOT NULL,
  starts_at DATETIME NOT NULL,
  expires_at DATETIME NOT NULL,
  status ENUM('DRAFT','SUBMITTED','UNDER_REVIEW','ACTIVE','REJECTED','EXPIRED','SUSPENDED') NOT NULL DEFAULT 'DRAFT',
  document_url TEXT NULL,
  submitted_at DATETIME NULL,
  reviewed_at DATETIME NULL,
  reviewed_by VARCHAR(191) NULL,
  review_comment TEXT NULL,
  created_by VARCHAR(191) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_club_insurance_policy (federation_id, policy_number),
  KEY idx_club_insurance_scope (federation_id, league_id, season_id, club_id, status),
  KEY idx_club_insurance_expiry (expires_at, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS person_insurance_policies (
  id CHAR(36) NOT NULL PRIMARY KEY,
  federation_id CHAR(36) NOT NULL,
  league_id CHAR(36) NULL,
  season_id CHAR(36) NOT NULL,
  person_type ENUM('PLAYER','STAFF','REFEREE','OTHER') NOT NULL,
  person_id VARCHAR(191) NOT NULL,
  club_id CHAR(36) NULL,
  policy_number VARCHAR(120) NOT NULL,
  provider VARCHAR(191) NOT NULL,
  coverage_type VARCHAR(80) NOT NULL DEFAULT 'PERSON',
  starts_at DATETIME NOT NULL,
  expires_at DATETIME NOT NULL,
  status ENUM('DRAFT','SUBMITTED','UNDER_REVIEW','ACTIVE','REJECTED','EXPIRED','SUSPENDED') NOT NULL DEFAULT 'DRAFT',
  document_url TEXT NULL,
  submitted_at DATETIME NULL,
  reviewed_at DATETIME NULL,
  reviewed_by VARCHAR(191) NULL,
  review_comment TEXT NULL,
  created_by VARCHAR(191) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_person_insurance_policy (federation_id, policy_number),
  KEY idx_person_insurance_scope (federation_id, league_id, season_id, person_type, person_id, status),
  KEY idx_person_insurance_expiry (expires_at, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS federation_grants (
  id CHAR(36) NOT NULL PRIMARY KEY,
  federation_id CHAR(36) NOT NULL,
  league_id CHAR(36) NULL,
  season_id CHAR(36) NULL,
  code VARCHAR(80) NOT NULL,
  name VARCHAR(191) NOT NULL,
  description TEXT NULL,
  total_budget DECIMAL(15,3) NOT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'TND',
  opens_at DATETIME NOT NULL,
  closes_at DATETIME NOT NULL,
  status ENUM('DRAFT','OPEN','CLOSED','ARCHIVED') NOT NULL DEFAULT 'DRAFT',
  eligibility_rules JSON NULL,
  created_by VARCHAR(191) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_federation_grant_code (federation_id, code),
  KEY idx_federation_grants_scope (federation_id, league_id, season_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS grant_applications (
  id CHAR(36) NOT NULL PRIMARY KEY,
  grant_id CHAR(36) NOT NULL,
  club_id CHAR(36) NOT NULL,
  requested_amount DECIMAL(15,3) NOT NULL,
  approved_amount DECIMAL(15,3) NULL,
  status ENUM('DRAFT','SUBMITTED','UNDER_REVIEW','APPROVED','PARTIALLY_APPROVED','REJECTED','PAID','CLOSED') NOT NULL DEFAULT 'DRAFT',
  purpose TEXT NOT NULL,
  budget JSON NULL,
  documents JSON NULL,
  submitted_at DATETIME NULL,
  reviewed_at DATETIME NULL,
  reviewed_by VARCHAR(191) NULL,
  review_comment TEXT NULL,
  created_by VARCHAR(191) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_grant_application_club (grant_id, club_id),
  KEY idx_grant_applications_status (grant_id, status, club_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS grant_payments (
  id CHAR(36) NOT NULL PRIMARY KEY,
  application_id CHAR(36) NOT NULL,
  amount DECIMAL(15,3) NOT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'TND',
  payment_reference VARCHAR(191) NULL,
  status ENUM('PLANNED','PROCESSING','PAID','FAILED','CANCELLED') NOT NULL DEFAULT 'PLANNED',
  paid_at DATETIME NULL,
  created_by VARCHAR(191) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_grant_payments_application (application_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS broadcasting_revenue_distributions (
  id CHAR(36) NOT NULL PRIMARY KEY,
  federation_id CHAR(36) NOT NULL,
  league_id CHAR(36) NULL,
  season_id CHAR(36) NOT NULL,
  competition_id CHAR(36) NULL,
  name VARCHAR(191) NOT NULL,
  gross_amount DECIMAL(15,3) NOT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'TND',
  distribution_rules JSON NULL,
  status ENUM('DRAFT','CALCULATED','APPROVED','PAID','CLOSED') NOT NULL DEFAULT 'DRAFT',
  approved_at DATETIME NULL,
  approved_by VARCHAR(191) NULL,
  created_by VARCHAR(191) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_broadcasting_distributions_scope (federation_id, league_id, season_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS broadcasting_revenue_allocations (
  id CHAR(36) NOT NULL PRIMARY KEY,
  distribution_id CHAR(36) NOT NULL,
  club_id CHAR(36) NOT NULL,
  fixed_amount DECIMAL(15,3) NOT NULL DEFAULT 0,
  performance_amount DECIMAL(15,3) NOT NULL DEFAULT 0,
  broadcast_amount DECIMAL(15,3) NOT NULL DEFAULT 0,
  bonus_amount DECIMAL(15,3) NOT NULL DEFAULT 0,
  deductions DECIMAL(15,3) NOT NULL DEFAULT 0,
  total_amount DECIMAL(15,3) NOT NULL DEFAULT 0,
  status ENUM('CALCULATED','APPROVED','PAID','DISPUTED') NOT NULL DEFAULT 'CALCULATED',
  payment_reference VARCHAR(191) NULL,
  paid_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_broadcasting_allocation_club (distribution_id, club_id),
  KEY idx_broadcasting_allocations_status (distribution_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS training_compensation_cases (
  id CHAR(36) NOT NULL PRIMARY KEY,
  federation_id CHAR(36) NOT NULL,
  league_id CHAR(36) NULL,
  season_id CHAR(36) NULL,
  player_id CHAR(36) NOT NULL,
  triggering_event ENUM('FIRST_PRO_CONTRACT','DOMESTIC_TRANSFER','OTHER') NOT NULL,
  reference_number VARCHAR(100) NOT NULL,
  liable_club_id CHAR(36) NOT NULL,
  base_amount DECIMAL(15,3) NOT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'TND',
  status ENUM('DRAFT','UNDER_REVIEW','CALCULATED','DECIDED','PAID','DISPUTED','CLOSED') NOT NULL DEFAULT 'DRAFT',
  rationale TEXT NULL,
  decided_at DATETIME NULL,
  decided_by VARCHAR(191) NULL,
  created_by VARCHAR(191) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_training_compensation_reference (federation_id, reference_number),
  KEY idx_training_compensation_scope (federation_id, league_id, season_id, player_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS training_compensation_beneficiaries (
  id CHAR(36) NOT NULL PRIMARY KEY,
  case_id CHAR(36) NOT NULL,
  club_id CHAR(36) NOT NULL,
  training_start DATE NOT NULL,
  training_end DATE NOT NULL,
  seasons_count DECIMAL(6,2) NOT NULL DEFAULT 0,
  allocation_rate DECIMAL(8,5) NOT NULL DEFAULT 0,
  amount DECIMAL(15,3) NOT NULL DEFAULT 0,
  status ENUM('PROPOSED','APPROVED','PAID','DISPUTED') NOT NULL DEFAULT 'PROPOSED',
  payment_reference VARCHAR(191) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_training_compensation_beneficiary (case_id, club_id, training_start, training_end),
  KEY idx_training_compensation_beneficiaries_status (case_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS solidarity_contributions (
  id CHAR(36) NOT NULL PRIMARY KEY,
  federation_id CHAR(36) NOT NULL,
  league_id CHAR(36) NULL,
  season_id CHAR(36) NULL,
  player_id CHAR(36) NOT NULL,
  triggering_club_id CHAR(36) NOT NULL,
  receiving_club_id CHAR(36) NOT NULL,
  transfer_amount DECIMAL(15,3) NOT NULL,
  contribution_rate DECIMAL(8,5) NOT NULL,
  contribution_amount DECIMAL(15,3) NOT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'TND',
  status ENUM('DRAFT','UNDER_REVIEW','CALCULATED','DECIDED','PAID','DISPUTED','CLOSED') NOT NULL DEFAULT 'DRAFT',
  reference_number VARCHAR(100) NOT NULL,
  decided_at DATETIME NULL,
  decided_by VARCHAR(191) NULL,
  created_by VARCHAR(191) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_solidarity_reference (federation_id, reference_number),
  KEY idx_solidarity_scope (federation_id, league_id, season_id, player_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS solidarity_allocations (
  id CHAR(36) NOT NULL PRIMARY KEY,
  contribution_id CHAR(36) NOT NULL,
  club_id CHAR(36) NOT NULL,
  training_start DATE NOT NULL,
  training_end DATE NOT NULL,
  allocation_rate DECIMAL(8,5) NOT NULL,
  amount DECIMAL(15,3) NOT NULL,
  status ENUM('PROPOSED','APPROVED','PAID','DISPUTED') NOT NULL DEFAULT 'PROPOSED',
  payment_reference VARCHAR(191) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_solidarity_allocation (contribution_id, club_id, training_start, training_end),
  KEY idx_solidarity_allocations_status (contribution_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS regulatory_document_requirements (
  id CHAR(36) NOT NULL PRIMARY KEY,
  federation_id CHAR(36) NOT NULL,
  league_id CHAR(36) NULL,
  season_id CHAR(36) NULL,
  domain ENUM('CLUB_LICENSE','COMPETITION_ENTRY','FINANCIAL_COMPLIANCE','INSURANCE','GRANT','COACH_LICENSE','STADIUM','GOVERNANCE','OTHER') NOT NULL,
  code VARCHAR(80) NOT NULL,
  name VARCHAR(191) NOT NULL,
  mandatory TINYINT(1) NOT NULL DEFAULT 1,
  valid_days INT NULL,
  applies_to ENUM('CLUB','PERSON','BOTH') NOT NULL DEFAULT 'CLUB',
  instructions TEXT NULL,
  active TINYINT(1) NOT NULL DEFAULT 1,
  created_by VARCHAR(191) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_regulatory_document_requirement (federation_id, domain, code),
  KEY idx_regulatory_document_requirement_scope (federation_id, league_id, season_id, domain, active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS regulatory_document_submissions (
  id CHAR(36) NOT NULL PRIMARY KEY,
  requirement_id CHAR(36) NOT NULL,
  club_id CHAR(36) NULL,
  person_type VARCHAR(50) NULL,
  person_id VARCHAR(191) NULL,
  related_entity_type VARCHAR(80) NOT NULL,
  related_entity_id VARCHAR(191) NOT NULL,
  version INT NOT NULL DEFAULT 1,
  file_url TEXT NOT NULL,
  checksum VARCHAR(128) NULL,
  issued_at DATETIME NULL,
  expires_at DATETIME NULL,
  status ENUM('SUBMITTED','UNDER_REVIEW','VALID','REJECTED','EXPIRED','SUPERSEDED') NOT NULL DEFAULT 'SUBMITTED',
  submitted_by VARCHAR(191) NOT NULL,
  submitted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  reviewed_by VARCHAR(191) NULL,
  reviewed_at DATETIME NULL,
  review_comment TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_regulatory_document_submission_version (requirement_id, related_entity_type, related_entity_id, version),
  KEY idx_regulatory_document_submission_status (requirement_id, status, expires_at),
  KEY idx_regulatory_document_submission_related (related_entity_type, related_entity_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS national_teams (
  id CHAR(36) NOT NULL PRIMARY KEY,
  federation_id CHAR(36) NOT NULL,
  code VARCHAR(80) NOT NULL,
  name VARCHAR(191) NOT NULL,
  age_category VARCHAR(50) NOT NULL,
  gender ENUM('MALE','FEMALE','MIXED') NOT NULL,
  discipline ENUM('FOOTBALL','FUTSAL','BEACH_SOCCER') NOT NULL DEFAULT 'FOOTBALL',
  status ENUM('ACTIVE','INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  created_by VARCHAR(191) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_national_team_code (federation_id, code),
  KEY idx_national_teams_scope (federation_id, status, discipline)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS national_team_events (
  id CHAR(36) NOT NULL PRIMARY KEY,
  national_team_id CHAR(36) NOT NULL,
  season_id CHAR(36) NULL,
  event_type ENUM('CAMP','MATCH','TRAVEL','MEDICAL','MEETING') NOT NULL,
  title VARCHAR(191) NOT NULL,
  starts_at DATETIME NOT NULL,
  ends_at DATETIME NULL,
  location VARCHAR(255) NULL,
  opponent VARCHAR(191) NULL,
  match_id CHAR(36) NULL,
  status ENUM('PLANNED','CONFIRMED','COMPLETED','CANCELLED') NOT NULL DEFAULT 'PLANNED',
  created_by VARCHAR(191) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_national_team_events (national_team_id, starts_at, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS national_team_callups (
  id CHAR(36) NOT NULL PRIMARY KEY,
  national_team_id CHAR(36) NOT NULL,
  season_id CHAR(36) NULL,
  player_id CHAR(36) NOT NULL,
  club_id CHAR(36) NULL,
  event_id CHAR(36) NULL,
  status ENUM('DRAFT','SUMMONED','CONFIRMED','DECLINED','RELEASED','WITHDRAWN') NOT NULL DEFAULT 'DRAFT',
  reporting_at DATETIME NULL,
  notes TEXT NULL,
  created_by VARCHAR(191) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_national_team_callup (national_team_id, player_id, event_id),
  KEY idx_national_team_callups_status (national_team_id, event_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE season_regulatory_cycles
  ADD COLUMN IF NOT EXISTS insurance_open_at DATETIME NULL,
  ADD COLUMN IF NOT EXISTS insurance_close_at DATETIME NULL,
  ADD COLUMN IF NOT EXISTS grant_application_open_at DATETIME NULL,
  ADD COLUMN IF NOT EXISTS grant_application_close_at DATETIME NULL,
  ADD COLUMN IF NOT EXISTS document_compliance_open_at DATETIME NULL,
  ADD COLUMN IF NOT EXISTS document_compliance_close_at DATETIME NULL,
  ADD COLUMN IF NOT EXISTS season_finalized_at DATETIME NULL;

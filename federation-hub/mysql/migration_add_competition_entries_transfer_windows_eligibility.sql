-- migration-v2 P0-006/P0-007/P0-008.
-- Le référentiel existant modélise une édition de compétition par saisons :
-- season_id est donc la portée compétition-saison, sans table competitions dupliquée.
USE foot;

ALTER TABLE saisons
  ADD COLUMN IF NOT EXISTS requires_stadium_approval tinyint(1) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS requires_financial_compliance tinyint(1) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS requires_medical_clearance tinyint(1) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS competition_entry_fee decimal(12,3) DEFAULT NULL;

CREATE TABLE IF NOT EXISTS competition_registrations (
  id char(36) NOT NULL DEFAULT uuid(),
  season_id char(36) NOT NULL,
  club_id char(36) NOT NULL,
  team_id char(36) NOT NULL,
  federation_id char(36) NOT NULL,
  league_id char(36) DEFAULT NULL,
  category varchar(50) NOT NULL,
  submitted_at datetime DEFAULT NULL,
  status enum('DRAFT','SUBMITTED','UNDER_REVIEW','CHANGES_REQUESTED','APPROVED','REJECTED','WITHDRAWN','SUSPENDED') NOT NULL DEFAULT 'DRAFT',
  club_license_id char(36) NOT NULL,
  stadium_approval_id char(36) DEFAULT NULL,
  financial_compliance_id char(36) DEFAULT NULL,
  documents_complete tinyint(1) NOT NULL DEFAULT 0,
  fees_amount decimal(12,3) DEFAULT NULL,
  fees_payment_id varchar(191) DEFAULT NULL,
  approved_at datetime DEFAULT NULL,
  approved_by varchar(191) DEFAULT NULL,
  rejection_reason text DEFAULT NULL,
  created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_competition_registration (season_id, team_id),
  KEY idx_competition_registration_scope (federation_id, league_id, status),
  CONSTRAINT fk_competition_registration_season FOREIGN KEY (season_id) REFERENCES saisons(id) ON DELETE RESTRICT,
  CONSTRAINT fk_competition_registration_club FOREIGN KEY (club_id) REFERENCES teams(id) ON DELETE RESTRICT,
  CONSTRAINT fk_competition_registration_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE RESTRICT,
  CONSTRAINT fk_competition_registration_federation FOREIGN KEY (federation_id) REFERENCES federations(id) ON DELETE RESTRICT,
  CONSTRAINT fk_competition_registration_league FOREIGN KEY (league_id) REFERENCES ligues(id) ON DELETE RESTRICT,
  CONSTRAINT fk_competition_registration_license FOREIGN KEY (club_license_id) REFERENCES club_license_applications(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE IF NOT EXISTS competition_registration_history (
  id char(36) NOT NULL DEFAULT uuid(),
  registration_id char(36) NOT NULL,
  action varchar(100) NOT NULL,
  from_status varchar(32) DEFAULT NULL,
  to_status varchar(32) DEFAULT NULL,
  actor_user_id varchar(191) DEFAULT NULL,
  actor_role varchar(50) NOT NULL,
  reason text DEFAULT NULL,
  before_value json DEFAULT NULL,
  after_value json DEFAULT NULL,
  ip_address varchar(45) DEFAULT NULL,
  user_agent varchar(512) DEFAULT NULL,
  created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_competition_registration_history (registration_id, created_at),
  CONSTRAINT fk_competition_registration_history FOREIGN KEY (registration_id) REFERENCES competition_registrations(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- regulatory_bans (PR #73 initiale) volontairement absente : ce périmètre
-- (interdictions de recrutement/participation) est déjà couvert par
-- `club_sanctions` (migration-v2 P0-009, federation-hub/mysql/migration_add_club_sanctions.sql),
-- déduplication faite lors de la fusion de cette migration.

CREATE TABLE IF NOT EXISTS transfer_windows (
  id char(36) NOT NULL DEFAULT uuid(),
  federation_id char(36) NOT NULL,
  league_id char(36) DEFAULT NULL,
  season_id char(36) NOT NULL,
  type enum('SUMMER','WINTER','SPECIAL','YOUTH','AMATEUR') NOT NULL,
  opens_at datetime NOT NULL,
  closes_at datetime NOT NULL,
  status enum('PLANNED','OPEN','CLOSED','SUSPENDED') NOT NULL DEFAULT 'PLANNED',
  exception_policy text DEFAULT NULL,
  created_by varchar(191) NOT NULL,
  created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_transfer_window_scope (federation_id, league_id, season_id, type, opens_at),
  KEY idx_transfer_window_lookup (season_id, federation_id, league_id, status, opens_at, closes_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE IF NOT EXISTS transfer_window_history (
  id char(36) NOT NULL DEFAULT uuid(),
  window_id char(36) NOT NULL,
  action varchar(100) NOT NULL,
  from_status varchar(32) DEFAULT NULL,
  to_status varchar(32) DEFAULT NULL,
  actor_user_id varchar(191) DEFAULT NULL,
  actor_role varchar(50) NOT NULL,
  reason text DEFAULT NULL,
  ip_address varchar(45) DEFAULT NULL,
  user_agent varchar(512) DEFAULT NULL,
  created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_transfer_window_history (window_id, created_at),
  CONSTRAINT fk_transfer_window_history FOREIGN KEY (window_id) REFERENCES transfer_windows(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE IF NOT EXISTS transfer_window_exceptions (
  id char(36) NOT NULL DEFAULT uuid(),
  transfer_id varchar(191) NOT NULL,
  reason text NOT NULL,
  legal_reference varchar(255) NOT NULL,
  approved_by varchar(191) NOT NULL,
  approved_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ip_address varchar(45) DEFAULT NULL,
  user_agent varchar(512) DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_transfer_window_exception_transfer (transfer_id),
  CONSTRAINT fk_transfer_window_exception_transfer FOREIGN KEY (transfer_id) REFERENCES player_transfers(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

ALTER TABLE player_transfers
  ADD COLUMN IF NOT EXISTS transfer_window_id char(36) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS transfer_window_exception_id char(36) DEFAULT NULL;

-- medical_eligibilities (PR #73 initiale) volontairement absente : cette
-- migration entrait en collision de schéma avec celle de migration-v2 P1-005
-- (federation-hub/mysql/migration_add_medical_eligibilities.sql, plus complète :
-- federation_id, league_id, created_by, document_url, expires_at nullable).
-- Le schéma P1-005 a été conservé comme canonique lors de la fusion.

CREATE TABLE IF NOT EXISTS eligibility_checks (
  id char(36) NOT NULL DEFAULT uuid(),
  player_id varchar(191) NOT NULL,
  club_id char(36) NOT NULL,
  match_id char(36) NOT NULL,
  season_id char(36) NOT NULL,
  eligible tinyint(1) NOT NULL,
  blocking_reasons json NOT NULL,
  warnings json NOT NULL,
  actor_user_id varchar(191) DEFAULT NULL,
  actor_role varchar(50) NOT NULL,
  ip_address varchar(45) DEFAULT NULL,
  user_agent varchar(512) DEFAULT NULL,
  checked_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_eligibility_check_match (match_id, club_id, checked_at),
  KEY idx_eligibility_check_player (player_id, checked_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

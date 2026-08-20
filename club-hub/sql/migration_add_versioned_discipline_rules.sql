-- CLUB-011 : règles disciplinaires versionnées et datées par club, saison,
-- type de compétition et catégorie. Les overrides sont bornés/révocables et
-- chaque carton traité par club-hub conserve un snapshot immuable de la règle.
USE foot;

CREATE TABLE cms_discipline_rule_sets (
  id char(36) NOT NULL,
  team_id char(36) NOT NULL,
  season_id char(36) NULL,
  competition_type enum('championnat','coupe','tournois') NULL,
  category varchar(50) NULL,
  version int NOT NULL,
  valid_from datetime NOT NULL,
  valid_until datetime NULL,
  yellow_warning_threshold int NOT NULL,
  yellow_suspension_threshold int NOT NULL,
  yellow_suspension_matches int NOT NULL,
  yellow_fine_amount decimal(10,3) NOT NULL,
  red_fine_amount decimal(10,3) NOT NULL,
  fine_due_days int NOT NULL,
  default_red_suspension_matches int NOT NULL,
  default_double_yellow_suspension_matches int NOT NULL,
  reason text NOT NULL,
  created_by varchar(191) NOT NULL,
  created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_discipline_rule_scope (team_id, season_id, competition_type, category, valid_from),
  UNIQUE KEY uq_discipline_rule_scope_version (team_id, season_id, competition_type, category, version),
  CONSTRAINT fk_discipline_rule_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE cms_discipline_rule_overrides (
  id char(36) NOT NULL,
  team_id char(36) NOT NULL,
  targetType enum('MATCH','PLAYER') NOT NULL,
  target_id varchar(191) NOT NULL,
  values json NOT NULL,
  valid_from datetime NOT NULL,
  valid_until datetime NULL,
  reason text NOT NULL,
  created_by varchar(191) NOT NULL,
  created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  revoked_at datetime NULL,
  revoked_by varchar(191) NULL,
  revocation_reason text NULL,
  PRIMARY KEY (id),
  KEY idx_discipline_override_target (team_id, targetType, target_id, valid_from),
  CONSTRAINT fk_discipline_override_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE cms_discipline_rule_applications (
  id char(36) NOT NULL,
  team_id char(36) NOT NULL,
  card_id varchar(191) NOT NULL,
  match_id char(36) NOT NULL,
  player_id varchar(191) NOT NULL,
  rule_set_id char(36) NULL,
  rule_version int NOT NULL,
  override_id char(36) NULL,
  context json NOT NULL,
  rule_snapshot json NOT NULL,
  applied_by varchar(191) NOT NULL,
  created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_discipline_rule_application_card (card_id),
  KEY idx_discipline_rule_application_team (team_id, created_at),
  CONSTRAINT fk_discipline_application_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
  CONSTRAINT fk_discipline_application_rule FOREIGN KEY (rule_set_id) REFERENCES cms_discipline_rule_sets(id) ON DELETE SET NULL,
  CONSTRAINT fk_discipline_application_override FOREIGN KEY (override_id) REFERENCES cms_discipline_rule_overrides(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- Le motif historique THREE_YELLOWS reste lisible pour les anciennes lignes.
-- YELLOW_ACCUMULATION représente tout seuil paramétré différent de trois.
ALTER TABLE Suspension
  MODIFY COLUMN reason enum(
    'THREE_YELLOWS',
    'YELLOW_ACCUMULATION',
    'CONSECUTIVE_YELLOWS',
    'RED_CARD_1',
    'RED_CARD_2',
    'RED_CARD_3',
    'DISCIPLINARY_DECISION'
  ) NOT NULL;

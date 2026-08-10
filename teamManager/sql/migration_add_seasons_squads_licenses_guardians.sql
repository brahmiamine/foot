-- Migration : fondation "saison interne du club" — vague de refonte
-- architecturale demandée pour distinguer clairement :
--   - `teams`            : référentiel de club partagé (ArbiNote/superadmin)
--   - `cms_teams`        : équipe SPORTIVE INTERNE du club (ex: "U17 A",
--                          "U17 B"), NOUVEAU, à ne pas confondre avec `teams`
--   - `saisons`          : saisons des compétitions FÉDÉRALES partagées
--                          (championnat/coupe/tournois, voir journees/ligues)
--   - `cms_seasons`      : saison INTERNE du club (ex: "2026/2027"), NOUVEAU,
--                          contexte temporel pour les équipes/effectifs/
--                          licences internes — indépendante du calendrier
--                          fédéral (un club peut avoir sa propre saison
--                          sportive alors qu'il joue plusieurs compétitions
--                          fédérales en parallèle)
--   - `cms_team_members` : devient la référence HISTORIQUE d'appartenance
--                          joueur/staff -> équipe interne -> saison
--
-- Toutes les tables sont additives (nouvelles tables ou colonnes nullables
-- sur des tables déjà propres à teamManager). Aucune table partagée avec
-- cardManager/ArbiNote/matchsheet/superadmin n'est modifiée. `Player.category`
-- et `cms_staff.category` sont conservés tels quels (cache de la catégorie
-- courante, cf. commentaire dans les entités) : rien ne casse le RBAC
-- existant tant que `cms_team_members.internal_team_id` n'est pas renseigné.

USE foot;

-- ---------------------------------------------------------------------
-- 1. Saisons internes du club
-- ---------------------------------------------------------------------

CREATE TABLE cms_seasons (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  team_id CHAR(36) NOT NULL,
  name VARCHAR(50) NOT NULL,
  start_date DATE NULL,
  end_date DATE NULL,
  status ENUM('PLANNED', 'ACTIVE', 'ARCHIVED') NOT NULL DEFAULT 'PLANNED',
  is_current TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_cms_seasons_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
  CONSTRAINT uq_cms_seasons_team_name UNIQUE (team_id, name),
  INDEX idx_cms_seasons_team_current (team_id, is_current)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- ---------------------------------------------------------------------
-- 2. Équipes sportives internes (ex: "U17 A", "U17 B", "Seniors A")
-- ---------------------------------------------------------------------

CREATE TABLE cms_teams (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  team_id CHAR(36) NOT NULL,
  season_id BIGINT NULL,
  name VARCHAR(100) NOT NULL,
  category ENUM(
    'seniors',
    'u21', 'u20', 'u19', 'u18', 'u17', 'u16', 'u15', 'u14', 'u13',
    'u12', 'u11', 'u10', 'u9', 'u8', 'u7'
  ) NOT NULL DEFAULT 'seniors',
  gender ENUM('male', 'female', 'mixed') NOT NULL DEFAULT 'male',
  code VARCHAR(20) NULL,
  status ENUM('ACTIVE', 'ARCHIVED') NOT NULL DEFAULT 'ACTIVE',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_cms_teams_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
  CONSTRAINT fk_cms_teams_season FOREIGN KEY (season_id) REFERENCES cms_seasons(id) ON DELETE SET NULL,
  INDEX idx_cms_teams_team_category (team_id, category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- ---------------------------------------------------------------------
-- 3. cms_team_members devient la référence historique d'appartenance :
--    saison + équipe interne, en plus du statut/dates déjà existants.
--    Colonnes nullables : les lignes existantes restent valides telles
--    quelles (aucun backfill destructif), la sélection de saison/équipe
--    interne devient possible progressivement depuis l'admin.
-- ---------------------------------------------------------------------

ALTER TABLE cms_team_members
  ADD COLUMN season_id BIGINT NULL AFTER team_id,
  ADD COLUMN internal_team_id BIGINT NULL AFTER season_id;

ALTER TABLE cms_team_members
  ADD CONSTRAINT fk_cms_team_members_season FOREIGN KEY (season_id) REFERENCES cms_seasons(id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_cms_team_members_internal_team FOREIGN KEY (internal_team_id) REFERENCES cms_teams(id) ON DELETE SET NULL,
  ADD INDEX idx_cms_team_members_season (season_id),
  ADD INDEX idx_cms_team_members_internal_team (internal_team_id);

-- ---------------------------------------------------------------------
-- 4. Licences (joueurs et staff unifiés) — avec colonnes de synchronisation
--    externe prévues dès maintenant pour un futur échange avec le système
--    de gestion des licences de la FTF (cache/import, jamais la source de
--    vérité officielle tant qu'aucune intégration n'existe).
-- ---------------------------------------------------------------------

CREATE TABLE cms_licenses (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  team_id CHAR(36) NOT NULL,
  season_id BIGINT NULL,
  holder_type ENUM('PLAYER', 'STAFF') NOT NULL,
  player_id VARCHAR(191) NULL,
  staff_id BIGINT NULL,
  license_number VARCHAR(50) NULL,
  license_type ENUM('PLAYER', 'COACH', 'EXECUTIVE', 'OTHER') NOT NULL DEFAULT 'PLAYER',
  status ENUM('PENDING', 'ACTIVE', 'EXPIRED', 'SUSPENDED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
  issued_at DATE NULL,
  expires_at DATE NULL,
  document_url VARCHAR(500) NULL,
  notes VARCHAR(500) NULL,
  external_id VARCHAR(100) NULL,
  external_source VARCHAR(50) NULL,
  external_status VARCHAR(50) NULL,
  last_synced_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_cms_licenses_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
  CONSTRAINT fk_cms_licenses_season FOREIGN KEY (season_id) REFERENCES cms_seasons(id) ON DELETE SET NULL,
  CONSTRAINT fk_cms_licenses_player FOREIGN KEY (player_id) REFERENCES Player(id) ON DELETE CASCADE,
  CONSTRAINT fk_cms_licenses_staff FOREIGN KEY (staff_id) REFERENCES cms_staff(id) ON DELETE CASCADE,
  CONSTRAINT chk_cms_licenses_holder CHECK (
    (holder_type = 'PLAYER' AND player_id IS NOT NULL AND staff_id IS NULL) OR
    (holder_type = 'STAFF' AND staff_id IS NOT NULL AND player_id IS NULL)
  ),
  INDEX idx_cms_licenses_team_status (team_id, status),
  INDEX idx_cms_licenses_expires (team_id, expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- ---------------------------------------------------------------------
-- 5. Disponibilité médicale exploitable directement par le moteur
--    d'éligibilité (injury.availability_status != 'AVAILABLE').
-- ---------------------------------------------------------------------

ALTER TABLE cms_injuries
  ADD COLUMN availability_status ENUM('UNAVAILABLE', 'RECOVERY', 'PARTIAL', 'AVAILABLE') NOT NULL DEFAULT 'UNAVAILABLE' AFTER status;

-- ---------------------------------------------------------------------
-- 6. Parents / responsables légaux — jamais rattachés à la table `User`
--    partagée avec cardManager, pour ne pas toucher au modèle de comptes
--    des autres apps. `user_id` reste optionnel pour un futur portail
--    parent, sans obligation de créer un compte de connexion.
-- ---------------------------------------------------------------------

CREATE TABLE cms_guardians (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  team_id CHAR(36) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  phone VARCHAR(30) NULL,
  email VARCHAR(191) NULL,
  address VARCHAR(255) NULL,
  user_id VARCHAR(191) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_cms_guardians_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
  CONSTRAINT fk_cms_guardians_user FOREIGN KEY (user_id) REFERENCES User(id) ON DELETE SET NULL,
  INDEX idx_cms_guardians_team (team_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE cms_player_guardians (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  player_id VARCHAR(191) NOT NULL,
  guardian_id BIGINT NOT NULL,
  relationship VARCHAR(50) NULL,
  is_primary TINYINT(1) NOT NULL DEFAULT 0,
  has_custody TINYINT(1) NOT NULL DEFAULT 1,
  receives_notifications TINYINT(1) NOT NULL DEFAULT 1,
  receives_documents TINYINT(1) NOT NULL DEFAULT 1,
  CONSTRAINT fk_cms_player_guardians_player FOREIGN KEY (player_id) REFERENCES Player(id) ON DELETE CASCADE,
  CONSTRAINT fk_cms_player_guardians_guardian FOREIGN KEY (guardian_id) REFERENCES cms_guardians(id) ON DELETE CASCADE,
  CONSTRAINT uq_cms_player_guardians UNIQUE (player_id, guardian_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- ---------------------------------------------------------------------
-- 7. cms_user_roles : dimension "équipe interne" optionnelle, en plus de
--    la catégorie déjà utilisée ("Coach" -> u17 devient possible "Coach"
--    -> U17 A précisément), sans rien casser du modèle existant.
-- ---------------------------------------------------------------------

ALTER TABLE cms_user_roles
  ADD COLUMN internal_team_id BIGINT NULL AFTER category;

ALTER TABLE cms_user_roles
  ADD CONSTRAINT fk_cms_user_roles_internal_team FOREIGN KEY (internal_team_id) REFERENCES cms_teams(id) ON DELETE SET NULL;

-- ---------------------------------------------------------------------
-- 8. Saison optionnelle sur les ressources déjà "annuelles" par nature.
-- ---------------------------------------------------------------------

ALTER TABLE cms_trainings ADD COLUMN season_id BIGINT NULL AFTER category;
ALTER TABLE cms_trainings ADD CONSTRAINT fk_cms_trainings_season FOREIGN KEY (season_id) REFERENCES cms_seasons(id) ON DELETE SET NULL;

ALTER TABLE cms_friendly_matches ADD COLUMN season_id BIGINT NULL AFTER category;
ALTER TABLE cms_friendly_matches ADD CONSTRAINT fk_cms_friendly_matches_season FOREIGN KEY (season_id) REFERENCES cms_seasons(id) ON DELETE SET NULL;

-- `season` (VARCHAR libre) existe déjà (import CSV par libellé) ; on ajoute
-- `internal_season_id` en complément pour un lien structuré optionnel.
ALTER TABLE cms_player_stats ADD COLUMN internal_season_id BIGINT NULL AFTER season;
ALTER TABLE cms_player_stats ADD CONSTRAINT fk_cms_player_stats_season FOREIGN KEY (internal_season_id) REFERENCES cms_seasons(id) ON DELETE SET NULL;

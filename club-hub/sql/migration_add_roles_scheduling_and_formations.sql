-- Migration : gestion des rôles/permissions par catégorie, matchs amicaux,
-- entraînements et composition (formation terrain) pour club-hub.
--
-- Toutes les nouvelles tables sont préfixées `cms_` (propres à cette app,
-- suivant la convention de migration_cms_unification.sql) et scopées par
-- `team_id` -> `teams.id` (table partagée avec ArbiNote/cardManager/match-operations).
-- Les seuls changements sur des tables partagées sont additifs et sans
-- risque pour les autres apps :
--   - `Player.category` et `cms_staff.category` : nouvelle colonne ENUM NOT
--     NULL DEFAULT 'seniors' (mêmes valeurs que `teams.age_category`), donc
--     toutes les lignes existantes restent valides sans backfill manuel.
--     cardManager ignore cette colonne (comme birthDate/position/imageUrl
--     déjà ajoutées par migration_unify_players.sql).
--   - `cms_match_lineups` / `cms_convocations` : colonnes additives pour
--     supporter les matchs amicaux (propres à club-hub) en plus des
--     matchs officiels déjà supportés ; `match_id` devient NULLABLE (un
--     enregistrement référence soit un match officiel soit un match amical,
--     jamais les deux — contrainte CHECK).
--
-- Ne JAMAIS supprimer/renommer une valeur d'enum existante ici.

USE foot;

-- ---------------------------------------------------------------------
-- 1. Catégorie interne (U7 -> Seniors) pour joueurs et staff, indépendante
--    de `teams.age_category` (qui reflète le championnat officiel du club).
--    Permet à un même club (un seul `teamId` de connexion) de gérer
--    plusieurs équipes internes (Seniors, U17, U15...) avec des joueurs/
--    staff distincts, condition nécessaire pour scoper un coach par
--    catégorie dans le système de rôles ci-dessous.
-- ---------------------------------------------------------------------

ALTER TABLE Player
  ADD COLUMN category ENUM(
    'seniors',
    'u21', 'u20', 'u19', 'u18', 'u17', 'u16', 'u15', 'u14', 'u13',
    'u12', 'u11', 'u10', 'u9', 'u8', 'u7'
  ) NOT NULL DEFAULT 'seniors' AFTER teamId;

ALTER TABLE Player
  ADD INDEX idx_player_team_category (teamId, category);

ALTER TABLE cms_staff
  ADD COLUMN category ENUM(
    'seniors',
    'u21', 'u20', 'u19', 'u18', 'u17', 'u16', 'u15', 'u14', 'u13',
    'u12', 'u11', 'u10', 'u9', 'u8', 'u7'
  ) NOT NULL DEFAULT 'seniors' AFTER staff_type;

ALTER TABLE cms_staff
  ADD INDEX idx_staff_team_category (team_id, category);

-- ---------------------------------------------------------------------
-- 2. Rôles & permissions (RBAC applicatif, propre à club-hub).
--    Le compte `User.role = 'ADMIN'` reste le super-admin du club
--    (président) : il a toujours accès complet et gère les rôles ci-dessous
--    pour les comptes `OBSERVATEUR` de son club. Un rôle "global"
--    (is_global = 1) voit/gère toutes les catégories (ex: Secrétaire
--    Général) ; sinon chaque attribution du rôle à un utilisateur précise
--    la catégorie concernée (ex: "Coach" attribué à Amine pour u17).
-- ---------------------------------------------------------------------

CREATE TABLE cms_roles (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  team_id CHAR(36) NOT NULL,
  name VARCHAR(100) NOT NULL,
  description VARCHAR(255) NULL,
  is_global TINYINT(1) NOT NULL DEFAULT 0,
  is_system TINYINT(1) NOT NULL DEFAULT 0,
  permissions TEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_cms_roles_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
  CONSTRAINT uq_cms_roles_team_name UNIQUE (team_id, name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE cms_user_roles (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  team_id CHAR(36) NOT NULL,
  user_id VARCHAR(191) NOT NULL,
  role_id BIGINT NOT NULL,
  category ENUM(
    'seniors',
    'u21', 'u20', 'u19', 'u18', 'u17', 'u16', 'u15', 'u14', 'u13',
    'u12', 'u11', 'u10', 'u9', 'u8', 'u7'
  ) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_cms_user_roles_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
  CONSTRAINT fk_cms_user_roles_user FOREIGN KEY (user_id) REFERENCES User(id) ON DELETE CASCADE,
  CONSTRAINT fk_cms_user_roles_role FOREIGN KEY (role_id) REFERENCES cms_roles(id) ON DELETE CASCADE,
  INDEX idx_cms_user_roles_team_user (team_id, user_id),
  INDEX idx_cms_user_roles_role (role_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- ---------------------------------------------------------------------
-- 3. Matchs amicaux — propres à club-hub (les matchs officiels restent
--    dans la table partagée `matches`, gérés par ArbiNote/cardManager).
--    L'adversaire peut être un club déjà présent dans le référentiel
--    partagé `teams` (opponent_team_id) ou un club créé à la volée
--    (opponent_name/opponent_logo_url, en texte libre). Le terrain peut
--    être un des stades du club (stadium_id -> cms_stadiums) ou un lieu
--    libre (venue_name), pour les matchs joués hors de ses installations.
-- ---------------------------------------------------------------------

CREATE TABLE cms_friendly_matches (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  team_id CHAR(36) NOT NULL,
  category ENUM(
    'seniors',
    'u21', 'u20', 'u19', 'u18', 'u17', 'u16', 'u15', 'u14', 'u13',
    'u12', 'u11', 'u10', 'u9', 'u8', 'u7'
  ) NOT NULL DEFAULT 'seniors',
  opponent_team_id CHAR(36) NULL,
  opponent_name VARCHAR(200) NULL,
  opponent_logo_url VARCHAR(255) NULL,
  is_home TINYINT(1) NOT NULL DEFAULT 1,
  stadium_id BIGINT NULL,
  venue_name VARCHAR(200) NULL,
  date DATETIME NOT NULL,
  score_home INT NULL,
  score_away INT NULL,
  status ENUM('UPCOMING', 'IN_PROGRESS', 'FINISHED', 'CANCELLED') NOT NULL DEFAULT 'UPCOMING',
  notes TEXT NULL,
  created_by VARCHAR(191) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_cms_friendly_matches_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
  CONSTRAINT fk_cms_friendly_matches_opponent FOREIGN KEY (opponent_team_id) REFERENCES teams(id) ON DELETE SET NULL,
  CONSTRAINT fk_cms_friendly_matches_stadium FOREIGN KEY (stadium_id) REFERENCES cms_stadiums(id) ON DELETE SET NULL,
  CONSTRAINT fk_cms_friendly_matches_creator FOREIGN KEY (created_by) REFERENCES User(id) ON DELETE SET NULL,
  CONSTRAINT chk_cms_friendly_matches_opponent CHECK (opponent_team_id IS NOT NULL OR opponent_name IS NOT NULL),
  INDEX idx_cms_friendly_matches_team (team_id, category, date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- ---------------------------------------------------------------------
-- 4. Entraînements + invitations des joueurs.
-- ---------------------------------------------------------------------

CREATE TABLE cms_trainings (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  team_id CHAR(36) NOT NULL,
  category ENUM(
    'seniors',
    'u21', 'u20', 'u19', 'u18', 'u17', 'u16', 'u15', 'u14', 'u13',
    'u12', 'u11', 'u10', 'u9', 'u8', 'u7'
  ) NOT NULL DEFAULT 'seniors',
  title VARCHAR(200) NOT NULL,
  training_type ENUM('TECHNIQUE', 'PHYSIQUE', 'TACTIQUE', 'PREPARATION_MATCH', 'RECUPERATION', 'AUTRE') NOT NULL DEFAULT 'AUTRE',
  date DATETIME NOT NULL,
  duration_minutes INT NULL,
  stadium_id BIGINT NULL,
  venue_name VARCHAR(200) NULL,
  notes TEXT NULL,
  status ENUM('SCHEDULED', 'DONE', 'CANCELLED') NOT NULL DEFAULT 'SCHEDULED',
  created_by VARCHAR(191) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_cms_trainings_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
  CONSTRAINT fk_cms_trainings_stadium FOREIGN KEY (stadium_id) REFERENCES cms_stadiums(id) ON DELETE SET NULL,
  CONSTRAINT fk_cms_trainings_creator FOREIGN KEY (created_by) REFERENCES User(id) ON DELETE SET NULL,
  INDEX idx_cms_trainings_team (team_id, category, date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE cms_training_invitations (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  training_id BIGINT NOT NULL,
  player_id VARCHAR(191) NOT NULL,
  response ENUM('PENDING', 'PRESENT', 'ABSENT') NOT NULL DEFAULT 'PENDING',
  notified_at DATETIME NULL,
  responded_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_cms_training_invitations_training FOREIGN KEY (training_id) REFERENCES cms_trainings(id) ON DELETE CASCADE,
  CONSTRAINT fk_cms_training_invitations_player FOREIGN KEY (player_id) REFERENCES Player(id) ON DELETE CASCADE,
  CONSTRAINT uq_cms_training_invitations UNIQUE (training_id, player_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- ---------------------------------------------------------------------
-- 5. Composition (titulaires/remplaçants) et convocations : support des
--    matchs amicaux en plus des matchs officiels, + coordonnées de
--    placement sur le terrain (drag & drop) et formation.
-- ---------------------------------------------------------------------

ALTER TABLE cms_match_lineups
  MODIFY COLUMN match_id CHAR(36) NULL,
  ADD COLUMN match_type ENUM('OFFICIAL', 'FRIENDLY') NOT NULL DEFAULT 'OFFICIAL' AFTER match_id,
  ADD COLUMN friendly_match_id BIGINT NULL AFTER match_type,
  ADD COLUMN pos_x DECIMAL(5,2) NULL AFTER position,
  ADD COLUMN pos_y DECIMAL(5,2) NULL AFTER pos_x;

ALTER TABLE cms_match_lineups
  ADD CONSTRAINT fk_cms_match_lineups_friendly_match FOREIGN KEY (friendly_match_id) REFERENCES cms_friendly_matches(id) ON DELETE CASCADE,
  ADD CONSTRAINT chk_cms_match_lineups_one_match CHECK (
    (match_type = 'OFFICIAL' AND match_id IS NOT NULL AND friendly_match_id IS NULL) OR
    (match_type = 'FRIENDLY' AND friendly_match_id IS NOT NULL AND match_id IS NULL)
  ),
  ADD INDEX idx_cms_match_lineups_friendly (friendly_match_id, team_id);

ALTER TABLE cms_convocations
  MODIFY COLUMN match_id CHAR(36) NULL,
  ADD COLUMN match_type ENUM('OFFICIAL', 'FRIENDLY') NOT NULL DEFAULT 'OFFICIAL' AFTER match_id,
  ADD COLUMN friendly_match_id BIGINT NULL AFTER match_type,
  ADD COLUMN lineup_role ENUM('STARTER', 'SUBSTITUTE') NULL AFTER response;

ALTER TABLE cms_convocations
  ADD CONSTRAINT fk_cms_convocations_friendly_match FOREIGN KEY (friendly_match_id) REFERENCES cms_friendly_matches(id) ON DELETE CASCADE,
  ADD CONSTRAINT chk_cms_convocations_one_match CHECK (
    (match_type = 'OFFICIAL' AND match_id IS NOT NULL AND friendly_match_id IS NULL) OR
    (match_type = 'FRIENDLY' AND friendly_match_id IS NOT NULL AND match_id IS NULL)
  ),
  ADD INDEX idx_cms_convocations_friendly (friendly_match_id, team_id);

-- Formation (schéma tactique) et verrouillage de la composition, un
-- enregistrement par match (officiel ou amical) et par club.
CREATE TABLE cms_match_formations (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  team_id CHAR(36) NOT NULL,
  match_type ENUM('OFFICIAL', 'FRIENDLY') NOT NULL DEFAULT 'OFFICIAL',
  match_id CHAR(36) NULL,
  friendly_match_id BIGINT NULL,
  formation VARCHAR(20) NOT NULL DEFAULT '4-3-3',
  is_locked TINYINT(1) NOT NULL DEFAULT 0,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_cms_match_formations_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
  CONSTRAINT fk_cms_match_formations_match FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
  CONSTRAINT fk_cms_match_formations_friendly_match FOREIGN KEY (friendly_match_id) REFERENCES cms_friendly_matches(id) ON DELETE CASCADE,
  CONSTRAINT chk_cms_match_formations_one_match CHECK (
    (match_type = 'OFFICIAL' AND match_id IS NOT NULL AND friendly_match_id IS NULL) OR
    (match_type = 'FRIENDLY' AND friendly_match_id IS NOT NULL AND match_id IS NULL)
  ),
  CONSTRAINT uq_cms_match_formations UNIQUE (team_id, match_type, match_id, friendly_match_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

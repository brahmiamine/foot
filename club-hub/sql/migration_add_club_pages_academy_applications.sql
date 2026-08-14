-- Migration: pages "Club" (histoire/palmarès, présentation, formation) et
-- workflows de candidature (inscription académie, recrutement, contact),
-- + communiqués officiels et réseaux sociaux. Tables additives cms_*,
-- scopées par team_id (CHAR36 -> teams.id), suivant la même convention que
-- migration_cms_unification.sql et migration_add_shop_sponsors_notifications.sql.

USE foot;

-- Enrichit les stades/installations existants avec un type, pour pouvoir
-- afficher stade principal / terrains d'entraînement / vestiaires / salle de
-- musculation / centre sportif sur /club sans nouvelle table (colonnes
-- additives, non destructives).
ALTER TABLE cms_stadiums
  ADD COLUMN facility_type ENUM('STADIUM','TRAINING_GROUND','LOCKER_ROOM','GYM','SPORTS_CENTER','OTHER') NOT NULL DEFAULT 'STADIUM' AFTER is_home,
  ADD COLUMN description_fr TEXT NULL AFTER capacity,
  ADD COLUMN description_ar TEXT NULL AFTER description_fr;

-- Présentation du club (/club) : qui sommes-nous, valeurs, projet sportif,
-- organisation. Un seul enregistrement par club (singleton).
CREATE TABLE cms_club_info (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  team_id CHAR(36) NOT NULL,
  presentation_fr LONGTEXT NULL,
  presentation_ar LONGTEXT NULL,
  values_fr LONGTEXT NULL,
  values_ar LONGTEXT NULL,
  sport_project_fr LONGTEXT NULL,
  sport_project_ar LONGTEXT NULL,
  organization_fr LONGTEXT NULL,
  organization_ar LONGTEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_cms_club_info_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
  CONSTRAINT uq_cms_club_info_team UNIQUE (team_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- Histoire du club (/club/histoire) : récit + date de création. Singleton.
CREATE TABLE cms_history (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  team_id CHAR(36) NOT NULL,
  founded_date DATE NULL,
  story_fr LONGTEXT NULL,
  story_ar LONGTEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_cms_history_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
  CONSTRAINT uq_cms_history_team UNIQUE (team_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- Grandes figures du club : présidents historiques, entraîneurs historiques,
-- grands joueurs, grandes équipes. Liste répétable, ordonnée.
CREATE TABLE cms_history_figures (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  team_id CHAR(36) NOT NULL,
  category ENUM('PRESIDENT','COACH','PLAYER','TEAM') NOT NULL,
  name_fr VARCHAR(200) NOT NULL,
  name_ar VARCHAR(200) NULL,
  period_fr VARCHAR(100) NULL COMMENT 'Ex: 1985-1990',
  description_fr TEXT NULL,
  description_ar TEXT NULL,
  photo_url VARCHAR(255) NULL,
  display_order INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_cms_history_figures_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
  INDEX idx_cms_history_figures_team (team_id, category, display_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- Palmarès : titres, coupes, records. Liste répétable, ordonnée.
CREATE TABLE cms_honors (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  team_id CHAR(36) NOT NULL,
  competition_fr VARCHAR(150) NOT NULL COMMENT 'Ex: Championnat, Coupe de Tunisie, Compétitions africaines',
  competition_ar VARCHAR(150) NULL,
  title_count INT NOT NULL DEFAULT 0,
  years_fr VARCHAR(255) NULL COMMENT 'Ex: 1985, 1990, 1998',
  icon VARCHAR(10) NULL COMMENT 'Emoji, ex: 🏆',
  display_order INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_cms_honors_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
  INDEX idx_cms_honors_team (team_id, display_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- Formation / académie (/formation) : catégories U6 -> Seniors.
CREATE TABLE cms_academy_categories (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  team_id CHAR(36) NOT NULL,
  code VARCHAR(10) NOT NULL COMMENT 'Ex: U6, U7, ..., U19',
  name_fr VARCHAR(100) NOT NULL,
  name_ar VARCHAR(100) NULL,
  age_range_fr VARCHAR(50) NULL,
  description_fr TEXT NULL,
  description_ar TEXT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  display_order INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_cms_academy_categories_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
  INDEX idx_cms_academy_categories_team (team_id, display_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- Formation / académie : philosophie, méthode, encadrement, infrastructures,
-- détection. Singleton.
CREATE TABLE cms_academy_info (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  team_id CHAR(36) NOT NULL,
  philosophy_fr LONGTEXT NULL,
  philosophy_ar LONGTEXT NULL,
  method_fr LONGTEXT NULL,
  method_ar LONGTEXT NULL,
  supervision_fr LONGTEXT NULL,
  supervision_ar LONGTEXT NULL,
  infrastructure_fr LONGTEXT NULL,
  infrastructure_ar LONGTEXT NULL,
  detection_fr LONGTEXT NULL,
  detection_ar LONGTEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_cms_academy_info_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
  CONSTRAINT uq_cms_academy_info_team UNIQUE (team_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- Candidatures "Inscrire mon enfant" (/inscription) — formulaire public.
CREATE TABLE cms_player_applications (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  team_id CHAR(36) NOT NULL,
  child_last_name VARCHAR(100) NOT NULL,
  child_first_name VARCHAR(100) NOT NULL,
  birth_date DATE NOT NULL,
  category VARCHAR(20) NOT NULL,
  position VARCHAR(50) NULL,
  parent_name VARCHAR(150) NOT NULL,
  parent_phone VARCHAR(30) NOT NULL,
  parent_email VARCHAR(190) NOT NULL,
  message TEXT NULL,
  document_url VARCHAR(255) NULL,
  status ENUM('NEW','CONTACTED','TRIAL','ACCEPTED','REJECTED') NOT NULL DEFAULT 'NEW',
  admin_notes TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_cms_player_applications_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
  INDEX idx_cms_player_applications_team (team_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- Recrutement : postes/catégories recherchés par le club, affichés sur
-- /recrutement.
CREATE TABLE cms_recruitment_needs (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  team_id CHAR(36) NOT NULL,
  category VARCHAR(20) NOT NULL,
  position VARCHAR(50) NOT NULL,
  description_fr TEXT NULL,
  description_ar TEXT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  display_order INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_cms_recruitment_needs_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
  INDEX idx_cms_recruitment_needs_team (team_id, is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- Recrutement : candidatures reçues via le formulaire public /recrutement.
CREATE TABLE cms_recruitment_applications (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  team_id CHAR(36) NOT NULL,
  name VARCHAR(150) NOT NULL,
  birth_date DATE NOT NULL,
  category VARCHAR(20) NOT NULL,
  position VARCHAR(50) NOT NULL,
  current_club VARCHAR(150) NULL,
  parent_phone VARCHAR(30) NOT NULL,
  email VARCHAR(190) NULL,
  video_url VARCHAR(255) NULL,
  message TEXT NULL,
  status ENUM('NEW','CONTACTED','TRIAL','ACCEPTED','REJECTED') NOT NULL DEFAULT 'NEW',
  admin_notes TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_cms_recruitment_applications_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
  INDEX idx_cms_recruitment_applications_team (team_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- Communiqués officiels (/communiques) : décisions, changements de
-- programme, informations administratives, recrutement, sanctions
-- publiques, annonces officielles.
CREATE TABLE cms_announcements (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  team_id CHAR(36) NOT NULL,
  title VARCHAR(200) NOT NULL,
  content_html LONGTEXT NOT NULL,
  category ENUM('DECISION','PROGRAMME','ADMINISTRATIF','RECRUTEMENT','SANCTION','ANNONCE') NOT NULL DEFAULT 'ANNONCE',
  is_published TINYINT(1) NOT NULL DEFAULT 0,
  published_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_cms_announcements_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
  INDEX idx_cms_announcements_team (team_id, is_published, published_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- Réseaux sociaux du club, configurables par club. Singleton.
CREATE TABLE cms_team_socials (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  team_id CHAR(36) NOT NULL,
  facebook_url VARCHAR(255) NULL,
  instagram_url VARCHAR(255) NULL,
  tiktok_url VARCHAR(255) NULL,
  youtube_url VARCHAR(255) NULL,
  x_url VARCHAR(255) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_cms_team_socials_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
  CONSTRAINT uq_cms_team_socials_team UNIQUE (team_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- Coordonnées du club (/contact) : adresse, téléphones/emails par
-- département, horaires, carte. Singleton.
CREATE TABLE cms_contact_info (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  team_id CHAR(36) NOT NULL,
  address_fr VARCHAR(255) NULL,
  address_ar VARCHAR(255) NULL,
  phone VARCHAR(30) NULL,
  email VARCHAR(190) NULL,
  opening_hours_fr VARCHAR(255) NULL,
  opening_hours_ar VARCHAR(255) NULL,
  map_embed_url VARCHAR(500) NULL,
  admin_phone VARCHAR(30) NULL,
  admin_email VARCHAR(190) NULL,
  sport_phone VARCHAR(30) NULL,
  sport_email VARCHAR(190) NULL,
  academy_phone VARCHAR(30) NULL,
  academy_email VARCHAR(190) NULL,
  partnership_phone VARCHAR(30) NULL,
  partnership_email VARCHAR(190) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_cms_contact_info_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
  CONSTRAINT uq_cms_contact_info_team UNIQUE (team_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- Messages envoyés via le formulaire public /contact (distinct de la table
-- partagée `contact_messages`, générique et non scopée par club).
CREATE TABLE cms_contact_messages (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  team_id CHAR(36) NOT NULL,
  name VARCHAR(150) NOT NULL,
  email VARCHAR(190) NOT NULL,
  subject VARCHAR(200) NOT NULL,
  department ENUM('GENERAL','ADMINISTRATIF','SPORTIF','ACADEMIE','PARTENARIAT') NOT NULL DEFAULT 'GENERAL',
  message TEXT NOT NULL,
  status ENUM('NEW','READ','REPLIED') NOT NULL DEFAULT 'NEW',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_cms_contact_messages_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
  INDEX idx_cms_contact_messages_team (team_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

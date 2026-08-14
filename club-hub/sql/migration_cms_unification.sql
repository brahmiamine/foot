-- Migration: unification de olympique-de-beja sur la base partagée "foot".
-- Federation/Team/Match sont réutilisées telles quelles (mêmes UUID que
-- ArbiNote/clubCard). Tout le reste (news, joueurs, staff, stades, médias)
-- devient des tables cms_* additives, scopées par team_id (CHAR36 -> teams.id),
-- pour que n'importe quel club du référentiel partagé puisse avoir sa propre
-- gestion de contenu sans toucher aux tables existantes.

USE foot;

-- Colonnes additives, non destructives, sur les tables partagées existantes.
ALTER TABLE federations
  ADD COLUMN country_fr VARCHAR(100) NULL,
  ADD COLUMN country_ar VARCHAR(100) NULL,
  ADD COLUMN website VARCHAR(255) NULL;

ALTER TABLE matches
  ADD COLUMN is_public_visible TINYINT(1) NOT NULL DEFAULT 1;

-- Joueurs (fiche/roster CMS, distincte du Player disciplinaire de clubCard).
CREATE TABLE cms_players (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  team_id CHAR(36) NOT NULL,
  first_name_fr VARCHAR(100) NOT NULL,
  last_name_fr VARCHAR(100) NOT NULL,
  first_name_ar VARCHAR(100) NULL,
  last_name_ar VARCHAR(100) NULL,
  birth_date DATE NOT NULL,
  position VARCHAR(50) NULL,
  jersey_number INT NULL,
  image_url VARCHAR(255) NULL,
  user_id BIGINT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_cms_players_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
  INDEX idx_cms_players_team (team_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE cms_staff (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  team_id CHAR(36) NOT NULL,
  first_name_fr VARCHAR(100) NOT NULL,
  last_name_fr VARCHAR(100) NOT NULL,
  first_name_ar VARCHAR(100) NULL,
  last_name_ar VARCHAR(100) NULL,
  birth_date DATE NOT NULL,
  phone VARCHAR(30) NULL,
  image_url VARCHAR(255) NULL,
  staff_type ENUM('COACH','ADJOINT','KINE','MEDECIN','PREPARATEUR','ANALYSTE','EQUIPEMENTIER','COMMUNICATION','AUTRE') NOT NULL DEFAULT 'COACH',
  user_id BIGINT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_cms_staff_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
  INDEX idx_cms_staff_team (team_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE cms_team_members (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  team_id CHAR(36) NOT NULL,
  player_id BIGINT NULL,
  staff_id BIGINT NULL,
  status ENUM('ACTIVE','SUSPENDED','ENDED') NOT NULL DEFAULT 'ACTIVE',
  start_date DATE NOT NULL,
  end_date DATE NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_cms_team_members_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
  CONSTRAINT fk_cms_team_members_player FOREIGN KEY (player_id) REFERENCES cms_players(id) ON DELETE CASCADE,
  CONSTRAINT fk_cms_team_members_staff FOREIGN KEY (staff_id) REFERENCES cms_staff(id) ON DELETE CASCADE,
  CONSTRAINT chk_cms_team_members_one_of CHECK ((player_id IS NOT NULL AND staff_id IS NULL) OR (player_id IS NULL AND staff_id IS NOT NULL)),
  INDEX idx_cms_team_members_team (team_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE cms_stadiums (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  team_id CHAR(36) NOT NULL,
  name_fr VARCHAR(200) NOT NULL,
  name_ar VARCHAR(200) NULL,
  address_fr VARCHAR(255) NULL,
  address_ar VARCHAR(255) NULL,
  city_fr VARCHAR(100) NULL,
  city_ar VARCHAR(100) NULL,
  is_home TINYINT(1) NOT NULL DEFAULT 0,
  capacity INT NULL,
  image_url VARCHAR(255) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_cms_stadiums_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
  INDEX idx_cms_stadiums_team (team_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE cms_news (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  team_id CHAR(36) NOT NULL,
  title VARCHAR(200) NOT NULL,
  content_html LONGTEXT NOT NULL,
  cover_image VARCHAR(255) NULL,
  author_id BIGINT NULL,
  status ENUM('DRAFT','PUBLISHED') NOT NULL DEFAULT 'DRAFT',
  is_published TINYINT(1) NOT NULL DEFAULT 0,
  published_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_cms_news_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
  INDEX idx_cms_news_team (team_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE cms_media_items (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  team_id CHAR(36) NOT NULL,
  uploader_id BIGINT NULL,
  url VARCHAR(255) NOT NULL,
  type ENUM('IMAGE','VIDEO','DOCUMENT','AUDIO') NOT NULL DEFAULT 'IMAGE',
  mime_type VARCHAR(100) NULL,
  alt_text_fr VARCHAR(255) NULL,
  alt_text_ar VARCHAR(255) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_cms_media_items_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
  INDEX idx_cms_media_items_team (team_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE cms_news_media (
  news_id BIGINT NOT NULL,
  media_item_id BIGINT NOT NULL,
  display_order INT NOT NULL DEFAULT 0,
  PRIMARY KEY (news_id, media_item_id),
  CONSTRAINT fk_cms_news_media_news FOREIGN KEY (news_id) REFERENCES cms_news(id) ON DELETE CASCADE,
  CONSTRAINT fk_cms_news_media_item FOREIGN KEY (media_item_id) REFERENCES cms_media_items(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE cms_media_galleries (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  team_id CHAR(36) NOT NULL,
  title_fr VARCHAR(200) NOT NULL,
  title_ar VARCHAR(200) NULL,
  description_fr TEXT NULL,
  description_ar TEXT NULL,
  cover_image_id BIGINT NULL,
  is_public TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_cms_media_galleries_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
  CONSTRAINT fk_cms_media_galleries_cover FOREIGN KEY (cover_image_id) REFERENCES cms_media_items(id) ON DELETE SET NULL,
  INDEX idx_cms_media_galleries_team (team_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE cms_media_gallery_items (
  gallery_id BIGINT NOT NULL,
  media_item_id BIGINT NOT NULL,
  display_order INT NOT NULL DEFAULT 0,
  PRIMARY KEY (gallery_id, media_item_id),
  CONSTRAINT fk_cms_mgi_gallery FOREIGN KEY (gallery_id) REFERENCES cms_media_galleries(id) ON DELETE CASCADE,
  CONSTRAINT fk_cms_mgi_item FOREIGN KEY (media_item_id) REFERENCES cms_media_items(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE cms_match_galleries (
  match_id CHAR(36) NOT NULL,
  gallery_id BIGINT NOT NULL,
  PRIMARY KEY (match_id, gallery_id),
  CONSTRAINT fk_cms_match_galleries_match FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
  CONSTRAINT fk_cms_match_galleries_gallery FOREIGN KEY (gallery_id) REFERENCES cms_media_galleries(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

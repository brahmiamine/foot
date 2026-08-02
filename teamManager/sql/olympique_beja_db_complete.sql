-- Schéma SQL - Accueil V2 (Optimisé + I18N SUPPORT) - VERSION CORRIGÉE
-- Remplace home_v1.sql
-- Intègre les améliorations pour supporter les modules externes (Media, Shop, Gamification)
-- ORDRE CORRIGÉ : Les tables sont créées dans l'ordre des dépendances

-- =========================================================================
-- TABLES DE BASE (Sans dépendances)
-- =========================================================================

CREATE TABLE sports (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    name_fr VARCHAR(150) NOT NULL,
    name_ar VARCHAR(150),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NULL ON UPDATE CURRENT_TIMESTAMP
) ENGINE = InnoDB;

CREATE TABLE categories (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE, -- U17, SENIOR
    label_fr VARCHAR(150) NOT NULL,
    label_ar VARCHAR(150)
) ENGINE = InnoDB;

CREATE TABLE users (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name_fr VARCHAR(150) NOT NULL,
    full_name_ar VARCHAR(150),
    phone VARCHAR(30),
    role ENUM(
        'ADMIN',
        'SOUS_ADMIN',
        'COACH',
        'ADJOINT',
        'STAFF',
        'JOUEUR',
        'SUPPORTER',
        'ARBITRE',
        'TRESORIER',
        'SECRETAIRE',
        'SPONSOR'
    ) NOT NULL DEFAULT 'SUPPORTER',
    preferred_lang ENUM('fr', 'ar', 'en') DEFAULT 'fr',
    current_points INT DEFAULT 0, -- Cache Gamification
    is_active BOOLEAN DEFAULT TRUE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NULL ON UPDATE CURRENT_TIMESTAMP
) ENGINE = InnoDB;

-- =========================================================================
-- TABLES AVEC DÉPENDANCES NIVEAU 1 (sports, categories, users)
-- =========================================================================

CREATE TABLE federations (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    sport_id BIGINT NOT NULL,
    name_fr VARCHAR(200) NOT NULL,
    name_ar VARCHAR(200),
    country_fr VARCHAR(100),
    country_ar VARCHAR(100),
    website VARCHAR(255),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_federations_sport FOREIGN KEY (sport_id) REFERENCES sports (id) ON DELETE CASCADE
) ENGINE = InnoDB;

CREATE TABLE clubs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    sport_id BIGINT NOT NULL,
    federation_id BIGINT NULL,
    league_id BIGINT NULL,
    name_fr VARCHAR(150) NOT NULL,
    name_ar VARCHAR(150),
    logo_url VARCHAR(255),
    slogan_fr VARCHAR(255),
    slogan_ar VARCHAR(255),
    city_fr VARCHAR(100),
    city_ar VARCHAR(100),
    email VARCHAR(150),
    phone VARCHAR(30),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_clubs_sport FOREIGN KEY (sport_id) REFERENCES sports (id) ON DELETE CASCADE
) ENGINE = InnoDB;

-- =========================================================================
-- TABLES AVEC DÉPENDANCES NIVEAU 2 (federations)
-- =========================================================================

CREATE TABLE leagues (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    federation_id BIGINT NOT NULL,
    name_fr VARCHAR(200) NOT NULL,
    name_ar VARCHAR(200),
    level VARCHAR(50),
    season VARCHAR(20),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_leagues_federation FOREIGN KEY (federation_id) REFERENCES federations (id) ON DELETE CASCADE
) ENGINE = InnoDB;

-- =========================================================================
-- TABLES AVEC DÉPENDANCES NIVEAU 3 (leagues, clubs)
-- =========================================================================

CREATE TABLE competitions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    league_id BIGINT NOT NULL,
    name_fr VARCHAR(200) NOT NULL,
    name_ar VARCHAR(200),
    type ENUM(
        'CHAMPIONSHIP',
        'CUP',
        'TOURNAMENT',
        'FRIENDLY'
    ) DEFAULT 'CHAMPIONSHIP',
    season VARCHAR(20),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_competitions_league FOREIGN KEY (league_id) REFERENCES leagues (id) ON DELETE CASCADE
) ENGINE = InnoDB;

CREATE TABLE stadiums (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    club_id BIGINT NULL,
    name_fr VARCHAR(200) NOT NULL,
    name_ar VARCHAR(200),
    address_fr VARCHAR(255),
    address_ar VARCHAR(255),
    city_fr VARCHAR(100),
    city_ar VARCHAR(100),
    is_home BOOLEAN DEFAULT FALSE,
    capacity INT NULL,
    image_url VARCHAR(255),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_stadiums_club FOREIGN KEY (club_id) REFERENCES clubs (id) ON DELETE SET NULL
) ENGINE = InnoDB;

-- Ajout des contraintes manquantes pour clubs après création de leagues
ALTER TABLE clubs
ADD CONSTRAINT fk_clubs_federation FOREIGN KEY (federation_id) REFERENCES federations (id) ON DELETE SET NULL,
ADD CONSTRAINT fk_clubs_league FOREIGN KEY (league_id) REFERENCES leagues (id) ON DELETE SET NULL;

-- =========================================================================
-- TABLES AVEC DÉPENDANCES NIVEAU 4 (clubs, sports, categories, users, stadiums)
-- =========================================================================

CREATE TABLE teams (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    club_id BIGINT NOT NULL,
    sport_id BIGINT NOT NULL,
    category_id BIGINT NOT NULL,
    name_fr VARCHAR(150) NOT NULL,
    name_ar VARCHAR(150),
    team_variant VARCHAR(50),
    gender ENUM('MALE', 'FEMALE', 'MIXED') DEFAULT 'MALE',
    stadium_id BIGINT NULL,
    coach_id BIGINT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_teams_club FOREIGN KEY (club_id) REFERENCES clubs (id) ON DELETE CASCADE,
    CONSTRAINT fk_teams_sport FOREIGN KEY (sport_id) REFERENCES sports (id) ON DELETE CASCADE,
    CONSTRAINT fk_teams_category FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE RESTRICT,
    CONSTRAINT fk_teams_stadium FOREIGN KEY (stadium_id) REFERENCES stadiums (id) ON DELETE SET NULL,
    CONSTRAINT fk_teams_coach FOREIGN KEY (coach_id) REFERENCES users (id) ON DELETE SET NULL
) ENGINE = InnoDB;

-- =========================================================================
-- TABLES AVEC DÉPENDANCES NIVEAU 5 (teams, users, categories)
-- =========================================================================

-- Table players : Entité métier sportive (peut exister sans compte utilisateur)
CREATE TABLE players (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    first_name_fr VARCHAR(100) NOT NULL,
    last_name_fr VARCHAR(100) NOT NULL,
    first_name_ar VARCHAR(100),
    last_name_ar VARCHAR(100),
    birth_date DATE NOT NULL,
    position VARCHAR(50), -- Ex: 'GOALKEEPER', 'DEFENDER', 'MIDFIELDER', 'FORWARD'
    jersey_number INT NULL,
    image_url VARCHAR(255) NULL, -- URL de l'image du joueur
    category_id BIGINT NULL, -- Référence à categories (U17, SENIOR, etc.)
    user_id BIGINT NULL, -- NULLABLE : Un joueur peut exister sans compte utilisateur
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_players_category FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE SET NULL,
    CONSTRAINT fk_players_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL
) ENGINE = InnoDB;

-- Table staff : Entité métier pour le staff technique (peut exister sans compte utilisateur)
CREATE TABLE staff (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    team_id BIGINT NULL, -- Référence à teams (nullable car un staff peut ne pas être assigné à une équipe)
    user_id BIGINT NULL, -- NULLABLE : Un staff peut exister sans compte utilisateur
    first_name_fr VARCHAR(100) NOT NULL,
    last_name_fr VARCHAR(100) NOT NULL,
    first_name_ar VARCHAR(100),
    last_name_ar VARCHAR(100),
    birth_date DATE NOT NULL,
    phone VARCHAR(30),
    image_url VARCHAR(255) NULL, -- URL de l'image du staff
    staff_type ENUM(
        'COACH',
        'ADJOINT',
        'KINE',
        'MEDECIN',
        'PREPARATEUR',
        'ANALYSTE',
        'EQUIPEMENTIER',
        'COMMUNICATION',
        'AUTRE'
    ) NOT NULL DEFAULT 'COACH',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_staff_team FOREIGN KEY (team_id) REFERENCES teams (id) ON DELETE SET NULL,
    CONSTRAINT fk_staff_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL
) ENGINE = InnoDB;

-- Table team_members : Relation entre teams et players/staff
-- Permet d'ajouter soit un joueur, soit un staff à une équipe
CREATE TABLE team_members (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    team_id BIGINT NOT NULL,
    player_id BIGINT NULL,
    staff_id BIGINT NULL,
    status ENUM(
        'ACTIVE',
        'SUSPENDED',
        'ENDED'
    ) NOT NULL DEFAULT 'ACTIVE',
    start_date DATE NOT NULL,
    end_date DATE NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_team_members_team FOREIGN KEY (team_id) REFERENCES teams (id) ON DELETE CASCADE,
    CONSTRAINT fk_team_members_player FOREIGN KEY (player_id) REFERENCES players (id) ON DELETE CASCADE,
    CONSTRAINT fk_team_members_staff FOREIGN KEY (staff_id) REFERENCES staff (id) ON DELETE CASCADE,
    CONSTRAINT chk_member_type CHECK (
        (
            player_id IS NOT NULL
            AND staff_id IS NULL
        )
        OR (
            player_id IS NULL
            AND staff_id IS NOT NULL
        )
    ),
    UNIQUE KEY uk_team_player (team_id, player_id),
    UNIQUE KEY uk_team_staff (team_id, staff_id)
) ENGINE = InnoDB;

CREATE TABLE matches (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    competition_id BIGINT NULL,
    home_team_id BIGINT NOT NULL,
    away_team_id BIGINT NOT NULL,
    stadium_id BIGINT NULL,
    match_day INT NULL,
    round_label_fr VARCHAR(100) NULL,
    round_label_ar VARCHAR(100) NULL,
    match_date DATETIME NOT NULL,
    status ENUM(
        'UPCOMING',
        'FINISHED',
        'CANCELLED',
        'POSTPONED'
    ) DEFAULT 'UPCOMING',
    home_score TINYINT NULL,
    away_score TINYINT NULL,
    is_public_visible BOOLEAN DEFAULT TRUE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_matches_home FOREIGN KEY (home_team_id) REFERENCES teams (id) ON DELETE CASCADE,
    CONSTRAINT fk_matches_away FOREIGN KEY (away_team_id) REFERENCES teams (id) ON DELETE CASCADE,
    CONSTRAINT fk_matches_comp FOREIGN KEY (competition_id) REFERENCES competitions (id) ON DELETE SET NULL,
    CONSTRAINT fk_matches_stadium FOREIGN KEY (stadium_id) REFERENCES stadiums (id) ON DELETE SET NULL
) ENGINE = InnoDB;

CREATE TABLE standings (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    competition_id BIGINT NOT NULL,
    team_id BIGINT NOT NULL,
    position INT NOT NULL,
    points INT NOT NULL,
    played INT NOT NULL DEFAULT 0,
    wins INT NOT NULL DEFAULT 0,
    draws INT NOT NULL DEFAULT 0,
    losses INT NOT NULL DEFAULT 0,
    goals_for INT NOT NULL DEFAULT 0,
    goals_against INT NOT NULL DEFAULT 0,
    goal_difference INT NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_standings_comp FOREIGN KEY (competition_id) REFERENCES competitions (id) ON DELETE CASCADE,
    CONSTRAINT fk_standings_team FOREIGN KEY (team_id) REFERENCES teams (id) ON DELETE CASCADE
) ENGINE = InnoDB;

CREATE TABLE sponsors (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name_fr VARCHAR(150) NOT NULL,
    name_ar VARCHAR(150),
    logo_url VARCHAR(255),
    level ENUM(
        'GOLD',
        'SILVER',
        'BRONZE',
        'LOCAL'
    ) DEFAULT 'LOCAL',
    website VARCHAR(255),
    offers_description_fr TEXT,
    offers_description_ar TEXT,
    user_id BIGINT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_sponsors_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL
) ENGINE = InnoDB;

CREATE TABLE news (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    content_html LONGTEXT NOT NULL,
    cover_image VARCHAR(255) NULL,
    author_id BIGINT NULL,
    status ENUM('DRAFT', 'PUBLISHED') NOT NULL DEFAULT 'DRAFT',
    is_published BOOLEAN NOT NULL DEFAULT FALSE,
    published_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_news_author FOREIGN KEY (author_id) REFERENCES users (id) ON DELETE SET NULL
) ENGINE = InnoDB;

-- =========================================================================
-- MODULE MEDIA & CMS (V1) - I18N SUPPORT
-- =========================================================================

CREATE TABLE media_items (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    uploader_id BIGINT NULL,
    url VARCHAR(255) NOT NULL,
    type ENUM(
        'IMAGE',
        'VIDEO',
        'DOCUMENT',
        'AUDIO'
    ) DEFAULT 'IMAGE',
    mime_type VARCHAR(100),
    alt_text_fr VARCHAR(255),
    alt_text_ar VARCHAR(255),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_media_uploader FOREIGN KEY (uploader_id) REFERENCES users (id) ON DELETE SET NULL
) ENGINE = InnoDB;

CREATE TABLE media_galleries (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    title_fr VARCHAR(200) NOT NULL,
    title_ar VARCHAR(200),
    description_fr TEXT,
    description_ar TEXT,
    cover_image_id BIGINT NULL,
    is_public BOOLEAN DEFAULT TRUE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_gallery_cover FOREIGN KEY (cover_image_id) REFERENCES media_items (id) ON DELETE SET NULL
) ENGINE = InnoDB;

CREATE TABLE media_gallery_items (
    gallery_id BIGINT NOT NULL,
    media_item_id BIGINT NOT NULL,
    display_order INT DEFAULT 0,
    PRIMARY KEY (gallery_id, media_item_id),
    CONSTRAINT fk_mgi_gallery FOREIGN KEY (gallery_id) REFERENCES media_galleries (id) ON DELETE CASCADE,
    CONSTRAINT fk_mgi_item FOREIGN KEY (media_item_id) REFERENCES media_items (id) ON DELETE CASCADE
) ENGINE = InnoDB;

CREATE TABLE news_media (
    news_id BIGINT NOT NULL,
    media_item_id BIGINT NOT NULL,
    display_order INT DEFAULT 0,
    PRIMARY KEY (news_id, media_item_id),
    CONSTRAINT fk_nm_news FOREIGN KEY (news_id) REFERENCES news (id) ON DELETE CASCADE,
    CONSTRAINT fk_nm_item FOREIGN KEY (media_item_id) REFERENCES media_items (id) ON DELETE CASCADE
) ENGINE = InnoDB;

CREATE TABLE matches_galleries (
    match_id BIGINT NOT NULL,
    gallery_id BIGINT NOT NULL,
    PRIMARY KEY (match_id, gallery_id),
    CONSTRAINT fk_mg_match FOREIGN KEY (match_id) REFERENCES matches (id) ON DELETE CASCADE,
    CONSTRAINT fk_mg_gallery FOREIGN KEY (gallery_id) REFERENCES media_galleries (id) ON DELETE CASCADE
) ENGINE = InnoDB;

-- =========================================================================
-- MODULE GAMIFICATION (Social V1) - I18N SUPPORT
-- =========================================================================

CREATE TABLE gamification_badges (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name_fr VARCHAR(100) NOT NULL,
    name_ar VARCHAR(100),
    description_fr VARCHAR(255),
    description_ar VARCHAR(255),
    icon_url VARCHAR(255),
    min_points_required INT DEFAULT 0,
    category ENUM(
        'LOYALTY',
        'PREDICTOR',
        'CONTRIBUTOR',
        'EVENT'
    ) DEFAULT 'LOYALTY',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NULL ON UPDATE CURRENT_TIMESTAMP
) ENGINE = InnoDB;

CREATE TABLE gamification_user_badges (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    badge_id BIGINT NOT NULL,
    awarded_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_user_badges_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_user_badges_badge FOREIGN KEY (badge_id) REFERENCES gamification_badges (id) ON DELETE CASCADE,
    UNIQUE KEY uk_user_badge (user_id, badge_id)
) ENGINE = InnoDB;

CREATE TABLE gamification_points_history (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    points INT NOT NULL,
    action_type VARCHAR(50) NOT NULL,
    label_fr VARCHAR(255),
    label_ar VARCHAR(255),
    related_entity_id BIGINT NULL,
    related_entity_type VARCHAR(50) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_points_history_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE = InnoDB;

CREATE TABLE gamification_man_of_match_votes (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    match_id BIGINT NOT NULL,
    player_id BIGINT NOT NULL,
    voted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_motm_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_motm_match FOREIGN KEY (match_id) REFERENCES matches (id) ON DELETE CASCADE,
    CONSTRAINT fk_motm_player FOREIGN KEY (player_id) REFERENCES team_members (id) ON DELETE CASCADE,
    UNIQUE KEY uk_motm_user_match (user_id, match_id)
) ENGINE = InnoDB;

CREATE TABLE gamification_predictions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    match_id BIGINT NOT NULL,
    home_score TINYINT NOT NULL,
    away_score TINYINT NOT NULL,
    first_scorer_id BIGINT NULL,
    points_earned INT NULL,
    status ENUM(
        'PENDING',
        'PROCESSED',
        'CANCELLED'
    ) DEFAULT 'PENDING',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_predictions_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_predictions_match FOREIGN KEY (match_id) REFERENCES matches (id) ON DELETE CASCADE,
    CONSTRAINT fk_predictions_scorer FOREIGN KEY (first_scorer_id) REFERENCES team_members (id) ON DELETE SET NULL,
    UNIQUE KEY uk_prediction_user_match (user_id, match_id)
) ENGINE = InnoDB;

CREATE INDEX idx_points_user ON gamification_points_history (user_id);

CREATE INDEX idx_motm_match ON gamification_man_of_match_votes (match_id);

CREATE INDEX idx_predictions_match ON gamification_predictions (match_id, status);

-- =========================================================================
-- MODULE BOUTIQUE / E-COMMERCE (V1) - I18N SUPPORT
-- =========================================================================

CREATE TABLE shop_categories (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name_fr VARCHAR(100) NOT NULL,
    name_ar VARCHAR(100),
    parent_id BIGINT NULL,
    slug VARCHAR(100) UNIQUE,
    CONSTRAINT fk_shop_cat_parent FOREIGN KEY (parent_id) REFERENCES shop_categories (id) ON DELETE SET NULL
) ENGINE = InnoDB;

CREATE TABLE shop_products (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    category_id BIGINT NULL,
    vendor_id BIGINT NULL,
    vendor_type ENUM('CLUB', 'SPONSOR') DEFAULT 'CLUB',
    name_fr VARCHAR(200) NOT NULL,
    name_ar VARCHAR(200),
    description_fr TEXT,
    description_ar TEXT,
    base_price DECIMAL(10, 2) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_prod_cat FOREIGN KEY (category_id) REFERENCES shop_categories (id) ON DELETE SET NULL
) ENGINE = InnoDB;

CREATE TABLE shop_product_variants (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    product_id BIGINT NOT NULL,
    sku VARCHAR(100) UNIQUE,
    size VARCHAR(50),
    color_fr VARCHAR(50),
    color_ar VARCHAR(50),
    price_modifier DECIMAL(10, 2) DEFAULT 0.00,
    stock_quantity INT NOT NULL DEFAULT 0,
    CONSTRAINT fk_variant_prod FOREIGN KEY (product_id) REFERENCES shop_products (id) ON DELETE CASCADE
) ENGINE = InnoDB;

CREATE TABLE shop_orders (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    order_ref VARCHAR(50) UNIQUE,
    status ENUM(
        'PENDING',
        'PAID',
        'PREPARING',
        'SHIPPED',
        'DELIVERED',
        'CANCELLED'
    ) DEFAULT 'PENDING',
    total_amount DECIMAL(10, 2) NOT NULL,
    payment_method VARCHAR(50),
    shipping_address TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_order_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE RESTRICT
) ENGINE = InnoDB;

CREATE TABLE shop_order_items (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    order_id BIGINT NOT NULL,
    variant_id BIGINT NULL,
    product_name_snapshot_fr VARCHAR(200),
    product_name_snapshot_ar VARCHAR(200),
    quantity INT NOT NULL DEFAULT 1,
    unit_price DECIMAL(10, 2) NOT NULL,
    subtotal DECIMAL(10, 2) NOT NULL,
    CONSTRAINT fk_item_order FOREIGN KEY (order_id) REFERENCES shop_orders (id) ON DELETE CASCADE,
    CONSTRAINT fk_item_variant FOREIGN KEY (variant_id) REFERENCES shop_product_variants (id) ON DELETE SET NULL
) ENGINE = InnoDB;

CREATE TABLE shop_cart (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    variant_id BIGINT NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_cart_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_cart_variant FOREIGN KEY (variant_id) REFERENCES shop_product_variants (id) ON DELETE CASCADE,
    UNIQUE KEY uk_cart_user_variant (user_id, variant_id)
) ENGINE = InnoDB;

-- =========================================================================
-- MODULE ENTRAÎNEMENTS & PERFORMANCE (V1) - I18N SUPPORT
-- =========================================================================

CREATE TABLE training_sessions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    team_id BIGINT NOT NULL,
    stadium_id BIGINT NULL,
    coach_id BIGINT NULL,
    start_time DATETIME NOT NULL,
    end_time DATETIME NOT NULL,
    title_fr VARCHAR(150),
    title_ar VARCHAR(150),
    description_fr TEXT,
    description_ar TEXT,
    is_cancelled BOOLEAN DEFAULT FALSE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_training_team FOREIGN KEY (team_id) REFERENCES teams (id) ON DELETE CASCADE,
    CONSTRAINT fk_training_stadium FOREIGN KEY (stadium_id) REFERENCES stadiums (id) ON DELETE SET NULL,
    CONSTRAINT fk_training_coach FOREIGN KEY (coach_id) REFERENCES users (id) ON DELETE SET NULL
) ENGINE = InnoDB;

CREATE TABLE training_attendance (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    session_id BIGINT NOT NULL,
    player_id BIGINT NOT NULL,
    status ENUM(
        'PRESENT',
        'ABSENT',
        'LATE',
        'EXCUSED',
        'INJURED'
    ) DEFAULT 'PRESENT',
    reason VARCHAR(255),
    performance_score TINYINT NULL,
    metadata JSON NULL,
    CONSTRAINT fk_att_session FOREIGN KEY (session_id) REFERENCES training_sessions (id) ON DELETE CASCADE,
    CONSTRAINT fk_att_player FOREIGN KEY (player_id) REFERENCES team_members (id) ON DELETE CASCADE,
    UNIQUE KEY uk_att_session_player (session_id, player_id)
) ENGINE = InnoDB;

CREATE TABLE player_physical_stats (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    player_id BIGINT NOT NULL,
    recorded_at DATE NOT NULL,
    weight_kg DECIMAL(5, 2),
    height_cm INT,
    vma DECIMAL(4, 2),
    notes TEXT,
    CONSTRAINT fk_phy_player FOREIGN KEY (player_id) REFERENCES team_members (id) ON DELETE CASCADE
) ENGINE = InnoDB;

-- =========================================================================
-- MODULES ADDITIONNELS (COMPLETUDE CAHIER DES CHARGES)
-- =========================================================================

CREATE TABLE match_events (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    match_id BIGINT NOT NULL,
    team_id BIGINT NULL,
    player_id BIGINT NULL,
    related_player_id BIGINT NULL,
    event_type ENUM(
        'GOAL',
        'YELLOW_CARD',
        'RED_CARD',
        'SUBSTITUTION_IN',
        'SUBSTITUTION_OUT',
        'WHISTLE',
        'COMMENT'
    ) NOT NULL,
    minute INT NOT NULL,
    extra_time INT NULL,
    comment_fr VARCHAR(255),
    comment_ar VARCHAR(255),
    video_url VARCHAR(255),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_event_match FOREIGN KEY (match_id) REFERENCES matches (id) ON DELETE CASCADE,
    CONSTRAINT fk_event_team FOREIGN KEY (team_id) REFERENCES teams (id) ON DELETE CASCADE,
    CONSTRAINT fk_event_player FOREIGN KEY (player_id) REFERENCES team_members (id) ON DELETE SET NULL,
    CONSTRAINT fk_event_rel_player FOREIGN KEY (related_player_id) REFERENCES team_members (id) ON DELETE SET NULL
) ENGINE = InnoDB;

CREATE TABLE polls (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    title_fr VARCHAR(255) NOT NULL,
    title_ar VARCHAR(255),
    description_fr TEXT,
    description_ar TEXT,
    start_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    end_at DATETIME NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    target_role ENUM('ALL', 'SUPPORTER', 'MEMBER') DEFAULT 'ALL',
    created_by BIGINT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_poll_creator FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL
) ENGINE = InnoDB;

CREATE TABLE poll_options (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    poll_id BIGINT NOT NULL,
    label_fr VARCHAR(150) NOT NULL,
    label_ar VARCHAR(150),
    image_url VARCHAR(255),
    display_order INT DEFAULT 0,
    CONSTRAINT fk_opt_poll FOREIGN KEY (poll_id) REFERENCES polls (id) ON DELETE CASCADE
) ENGINE = InnoDB;

CREATE TABLE poll_votes (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    poll_id BIGINT NOT NULL,
    option_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    voted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_vote_poll FOREIGN KEY (poll_id) REFERENCES polls (id) ON DELETE CASCADE,
    CONSTRAINT fk_vote_option FOREIGN KEY (option_id) REFERENCES poll_options (id) ON DELETE CASCADE,
    CONSTRAINT fk_vote_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    UNIQUE KEY uk_poll_user (poll_id, user_id)
) ENGINE = InnoDB;

CREATE TABLE notifications (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    type ENUM(
        'MATCH_EVENT',
        'RESULT',
        'TRAINING',
        'SHOP_PROMO',
        'GENERAL',
        'REMINDER'
    ) NOT NULL,
    title_fr VARCHAR(150) NOT NULL,
    title_ar VARCHAR(150),
    message_fr TEXT,
    message_ar TEXT,
    link_url VARCHAR(255),
    is_read BOOLEAN DEFAULT FALSE,
    sent_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_notif_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE = InnoDB;

CREATE TABLE admin_documents (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NULL,
    title_fr VARCHAR(200) NOT NULL,
    title_ar VARCHAR(200),
    file_url VARCHAR(255) NOT NULL,
    doc_type ENUM(
        'CONTRACT',
        'LICENSE',
        'CERTIFICATE',
        'AUTHORIZATION',
        'OTHER'
    ) NOT NULL,
    expiration_date DATE NULL,
    uploaded_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_doc_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL
) ENGINE = InnoDB;

CREATE TABLE finance_transactions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    type ENUM('REVENUE', 'EXPENSE') NOT NULL,
    category ENUM(
        'SUBSCRIPTION',
        'SPONSORING',
        'SHOP',
        'SALARY',
        'EQUIPMENT',
        'OTHER'
    ) NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    description_fr VARCHAR(255),
    description_ar VARCHAR(255),
    transaction_date DATE NOT NULL,
    related_user_id BIGINT NULL,
    proof_url VARCHAR(255),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by BIGINT NULL,
    CONSTRAINT fk_fin_user FOREIGN KEY (related_user_id) REFERENCES users (id) ON DELETE SET NULL,
    CONSTRAINT fk_fin_creator FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL
) ENGINE = InnoDB;

CREATE TABLE medical_records (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    player_id BIGINT NOT NULL,
    doctor_id BIGINT NULL,
    record_date DATE NOT NULL,
    injury_type VARCHAR(150),
    diagnosis_fr TEXT,
    diagnosis_ar TEXT,
    treatment_plan_fr TEXT,
    treatment_plan_ar TEXT,
    estimated_return_date DATE NULL,
    status ENUM('INJURED', 'RECOVERY', 'FIT') DEFAULT 'INJURED',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_med_player FOREIGN KEY (player_id) REFERENCES team_members (id) ON DELETE CASCADE,
    CONSTRAINT fk_med_doc FOREIGN KEY (doctor_id) REFERENCES users (id) ON DELETE SET NULL
) ENGINE = InnoDB;

CREATE TABLE sponsor_daily_stats (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    sponsor_id BIGINT NOT NULL,
    stat_date DATE NOT NULL,
    views_count INT DEFAULT 0,
    clicks_count INT DEFAULT 0,
    CONSTRAINT fk_spon_stat FOREIGN KEY (sponsor_id) REFERENCES sponsors (id) ON DELETE CASCADE,
    UNIQUE KEY uk_sponsor_date (sponsor_id, stat_date)
) ENGINE = InnoDB;

CREATE TABLE match_officials (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    match_id BIGINT NOT NULL,
    user_id BIGINT NULL,
    external_name VARCHAR(150) NULL,
    role ENUM(
        'MAIN_REFEREE',
        'ASSISTANT_REFEREE_1',
        'ASSISTANT_REFEREE_2',
        'FOURTH_OFFICIAL',
        'VAR',
        'DELEGATE'
    ) NOT NULL,
    CONSTRAINT fk_off_match FOREIGN KEY (match_id) REFERENCES matches (id) ON DELETE CASCADE,
    CONSTRAINT fk_off_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL
) ENGINE = InnoDB;

CREATE TABLE match_squads (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    match_id BIGINT NOT NULL,
    team_member_id BIGINT NOT NULL,
    is_starter BOOLEAN DEFAULT FALSE,
    jersey_number INT NULL,
    position_on_field VARCHAR(50) NULL,
    CONSTRAINT fk_squad_match FOREIGN KEY (match_id) REFERENCES matches (id) ON DELETE CASCADE,
    CONSTRAINT fk_squad_member FOREIGN KEY (team_member_id) REFERENCES team_members (id) ON DELETE CASCADE,
    UNIQUE KEY uk_squad_match_player (match_id, team_member_id)
) ENGINE = InnoDB;
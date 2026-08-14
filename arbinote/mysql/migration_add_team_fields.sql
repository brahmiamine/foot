-- Migration: Ajouter les champs team_type, country_code, sport, age_category à la table teams

-- Ajouter le champ team_type (club ou sélection nationale)
ALTER TABLE `teams`
ADD COLUMN `team_type` ENUM('club', 'national') NOT NULL DEFAULT 'club' AFTER `nom_ar`;

-- Ajouter le champ country_code (code pays ISO 3 lettres)
ALTER TABLE `teams`
ADD COLUMN `country_code` VARCHAR(3) NULL DEFAULT NULL AFTER `team_type`;

-- Ajouter le champ sport
ALTER TABLE `teams`
ADD COLUMN `sport` ENUM(
    'football',
    'handball',
    'basketball',
    'volleyball'
) NOT NULL DEFAULT 'football' AFTER `country_code`;

-- Ajouter le champ age_category
ALTER TABLE `teams`
ADD COLUMN `age_category` ENUM(
    'seniors',
    'u21',
    'u20',
    'u19',
    'u18',
    'u17',
    'u16',
    'u15',
    'u14',
    'u13'
) NOT NULL DEFAULT 'seniors' AFTER `sport`;

-- Ajouter un index sur country_code pour les recherches
ALTER TABLE `teams` ADD INDEX `idx_teams_country` (`country_code`);

-- Ajouter un index sur sport pour les recherches
ALTER TABLE `teams` ADD INDEX `idx_teams_sport` (`sport`);

-- Ajouter un index sur team_type pour les recherches
ALTER TABLE `teams` ADD INDEX `idx_teams_type` (`team_type`);

-- Ajouter un index sur age_category pour les recherches
ALTER TABLE `teams`
ADD INDEX `idx_teams_age_category` (`age_category`);

-- Mettre à jour les équipes tunisiennes existantes (basé sur city_ar non null)
UPDATE `teams`
SET
    `country_code` = 'TUN'
WHERE
    `city_ar` IS NOT NULL
    AND `country_code` IS NULL;

-- Mettre à jour les équipes françaises existantes (basé sur les villes françaises connues)
UPDATE `teams`
SET
    `country_code` = 'FRA'
WHERE
    `city` IN (
        'Paris',
        'Lyon',
        'Marseille',
        'Lille',
        'Bordeaux',
        'Metz',
        'Caen',
        'Bastia',
        'Guingamp',
        'Saint-Étienne'
    )
    AND `country_code` IS NULL;
-- Script pour vérifier et ajouter les colonnes is_active si elles n'existent pas

-- Vérifier et ajouter is_active à federations
SET @col_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'federations' 
  AND COLUMN_NAME = 'is_active'
);

SET @sql = IF(@col_exists = 0,
  'ALTER TABLE `federations` ADD COLUMN `is_active` BOOLEAN DEFAULT TRUE NOT NULL AFTER `logo_url`',
  'SELECT "Column is_active already exists in federations" AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Vérifier et ajouter is_active à ligues
SET @col_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'ligues' 
  AND COLUMN_NAME = 'is_active'
);

SET @sql = IF(@col_exists = 0,
  'ALTER TABLE `ligues` ADD COLUMN `is_active` BOOLEAN DEFAULT TRUE NOT NULL AFTER `logo_url`',
  'SELECT "Column is_active already exists in ligues" AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Mettre toutes les fédérations existantes comme actives par défaut
UPDATE `federations` SET `is_active` = TRUE WHERE `is_active` IS NULL;

-- Mettre toutes les ligues existantes comme actives par défaut
UPDATE `ligues` SET `is_active` = TRUE WHERE `is_active` IS NULL;


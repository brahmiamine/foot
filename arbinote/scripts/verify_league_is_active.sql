-- Script pour vérifier et ajouter la colonne is_active à la table ligues si elle n'existe pas

-- Vérifier si la colonne existe
SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'ligues'
  AND COLUMN_NAME = 'is_active';

-- Si la colonne n'existe pas, l'ajouter
-- Décommenter et exécuter si nécessaire :
-- ALTER TABLE `ligues` 
-- ADD COLUMN `is_active` BOOLEAN DEFAULT TRUE NOT NULL AFTER `logo_url`;

-- Mettre à jour toutes les ligues existantes pour être actives par défaut si la colonne vient d'être ajoutée
-- UPDATE `ligues` SET `is_active` = TRUE WHERE `is_active` IS NULL;


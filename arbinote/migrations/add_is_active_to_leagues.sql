-- Migration: Ajouter la colonne is_active à la table ligues
-- Date: 2025-01-XX

ALTER TABLE `ligues` 
ADD COLUMN `is_active` BOOLEAN DEFAULT TRUE NOT NULL AFTER `logo_url`;

-- Mettre toutes les ligues existantes comme actives par défaut
UPDATE `ligues` SET `is_active` = TRUE WHERE `is_active` IS NULL;

-- Migration: Ajouter la colonne is_active à la table federations
-- Date: 2025-01-XX

ALTER TABLE `federations` 
ADD COLUMN `is_active` BOOLEAN DEFAULT TRUE NOT NULL AFTER `logo_url`;

-- Mettre toutes les fédérations existantes comme actives par défaut
UPDATE `federations` SET `is_active` = TRUE WHERE `is_active` IS NULL;

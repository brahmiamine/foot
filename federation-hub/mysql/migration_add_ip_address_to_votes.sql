-- Migration: Ajout de la colonne ip_address à la table votes
-- Date: 2025-01-XX
-- Description: Ajoute le champ ip_address pour enregistrer l'adresse IP des votes
--              et créer un index pour améliorer les performances des requêtes

-- Idempotent : la colonne et les index peuvent déjà exister sur une base issue
-- de db/foot.sql (dump postérieur à cette migration), d'où les IF NOT EXISTS.
ALTER TABLE `votes`
ADD COLUMN IF NOT EXISTS `ip_address` varchar(45) DEFAULT NULL AFTER `device_fingerprint`;

-- Créer un index composite pour améliorer les performances des requêtes de rate limiting
-- Cet index permet de rechercher rapidement les votes par IP et date
ALTER TABLE `votes`
ADD KEY IF NOT EXISTS `idx_votes_ip_date` (`ip_address`, `created_at`);

-- Créer un index pour les recherches par IP uniquement
ALTER TABLE `votes` ADD KEY IF NOT EXISTS `idx_votes_ip` (`ip_address`);
-- Migration: Ajout de la colonne ip_address à la table votes
-- Date: 2025-01-XX
-- Description: Ajoute le champ ip_address pour enregistrer l'adresse IP des votes
--              et créer un index pour améliorer les performances des requêtes

-- Ajouter la colonne ip_address
ALTER TABLE `votes`
ADD COLUMN `ip_address` varchar(45) DEFAULT NULL AFTER `device_fingerprint`;

-- Créer un index composite pour améliorer les performances des requêtes de rate limiting
-- Cet index permet de rechercher rapidement les votes par IP et date
ALTER TABLE `votes`
ADD KEY `idx_votes_ip_date` (`ip_address`, `created_at`);

-- Créer un index pour les recherches par IP uniquement
ALTER TABLE `votes` ADD KEY `idx_votes_ip` (`ip_address`);
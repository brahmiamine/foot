-- Migration: Ajout de la colonne moderation_status à la table votes
-- Description: Permet de marquer manuellement les votes comme validés ou exclus

ALTER TABLE `votes`
  ADD COLUMN `moderation_status` enum('pending','validated','excluded') DEFAULT 'pending' AFTER `ip_address`,
  ADD COLUMN `moderated_at` datetime DEFAULT NULL AFTER `moderation_status`,
  ADD COLUMN `moderated_by` varchar(36) DEFAULT NULL AFTER `moderated_at`,
  ADD COLUMN `moderation_notes` text DEFAULT NULL AFTER `moderated_by`;

-- Index pour optimiser les requêtes de modération
ALTER TABLE `votes`
  ADD KEY `idx_votes_moderation_status` (`moderation_status`);


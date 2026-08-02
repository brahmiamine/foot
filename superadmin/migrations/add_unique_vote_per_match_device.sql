-- Migration: Empêcher les votes en double pour un même match + appareil au niveau base
-- Le contrôle applicatif (vérification avant insertion) est vulnérable à une race condition
-- (deux requêtes simultanées peuvent toutes deux passer la vérification avant l'insertion).
-- Cette contrainte garantit l'unicité même en cas de requêtes concurrentes.
-- Note: MySQL/MariaDB ne considère jamais deux NULL comme égaux dans un index UNIQUE,
-- donc les votes avec device_fingerprint NULL (aucun ne devrait exister en pratique) ne sont pas bloqués.

ALTER TABLE `votes`
ADD UNIQUE KEY `uniq_votes_match_device` (`match_id`, `device_fingerprint`);

-- Migration: Ajout des horaires réels de début/fin de match
-- Description: matches.date reste l'horaire programmé (peut changer avant le
--              coup d'envoi, voir MATCH_RESCHEDULED). actual_started_at /
--              actual_finished_at sont renseignés uniquement par matchsheet,
--              seul endroit qui sait avec certitude quand un match démarre et
--              finit réellement (voir avancement.md, US-01/TS-02).

ALTER TABLE `matches`
ADD COLUMN `actual_started_at` datetime DEFAULT NULL AFTER `status`,
ADD COLUMN `actual_finished_at` datetime DEFAULT NULL AFTER `actual_started_at`;

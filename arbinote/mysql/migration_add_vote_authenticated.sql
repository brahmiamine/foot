-- Migration: Vote authentifié (TASK-P0-022)
-- Ajoute user_id (id utilisateur SSO, espace membre) pour permettre un vote
-- authentifié en plus du vote anonyme par fingerprint existant. Un vote
-- authentifié garantit un vote par personne réelle par match (contrainte
-- unique ci-dessous) — plus fort que le fingerprint seul, contournable en
-- changeant d'appareil/navigateur. NULL pour un vote anonyme (comportement
-- historique inchangé), MySQL traite NULL comme distinct de toute autre
-- valeur dans un index unique : les votes anonymes ne se bloquent jamais
-- entre eux sur cette contrainte.

ALTER TABLE `votes`
ADD COLUMN `user_id` varchar(36) DEFAULT NULL AFTER `device_fingerprint`;

ALTER TABLE `votes`
ADD UNIQUE KEY `uniq_votes_match_user` (`match_id`, `user_id`);

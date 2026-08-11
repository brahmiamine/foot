-- Champs de profil optionnels pour les comptes MEMBER (avancement.md,
-- "Paymee : profil MEMBER incomplet") : Paymee exige firstName/lastName/
-- phoneNumber à l'initiation d'un paiement, des champs que `User` ne
-- portait pas jusqu'ici (seul `name`, un champ unique, existait). Additive
-- uniquement : NULL par défaut, aucun compte existant (staff ou membre)
-- n'est affecté tant qu'il ne les renseigne pas lui-même.

USE foot;

ALTER TABLE `User`
  ADD COLUMN IF NOT EXISTS `firstName` VARCHAR(100) NULL AFTER `name`,
  ADD COLUMN IF NOT EXISTS `lastName` VARCHAR(100) NULL AFTER `firstName`,
  ADD COLUMN IF NOT EXISTS `phoneNumber` VARCHAR(30) NULL AFTER `lastName`;

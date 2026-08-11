-- MFA (TOTP) pour les comptes SUPERADMIN (avancement.md, rang 8). Additive
-- uniquement : mfa_enabled par défaut à 0, aucun compte existant n'est
-- affecté tant qu'il n'active pas la MFA lui-même via /account/mfa.

USE foot;

ALTER TABLE `User`
  ADD COLUMN IF NOT EXISTS `mfa_secret` VARCHAR(191) NULL AFTER `teamId`,
  ADD COLUMN IF NOT EXISTS `mfa_enabled` TINYINT(1) NOT NULL DEFAULT 0 AFTER `mfa_secret`,
  ADD COLUMN IF NOT EXISTS `mfa_recovery_codes` TEXT NULL AFTER `mfa_enabled`;

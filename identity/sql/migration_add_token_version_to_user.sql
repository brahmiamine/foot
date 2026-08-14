-- Révocation de session (avancement.md, rang 8). Additive : token_version
-- démarre à 0 pour tous les comptes existants, donc leurs sessions déjà
-- émises restent valides (le JWT signé avant cette migration n'a pas de
-- claim tokenVersion ; voir src/lib/session.ts pour comment ce cas est
-- traité comme équivalent à 0).

USE foot;

ALTER TABLE `User`
  ADD COLUMN IF NOT EXISTS `token_version` INT NOT NULL DEFAULT 0 AFTER `mfa_recovery_codes`;

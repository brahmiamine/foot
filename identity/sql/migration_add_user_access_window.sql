-- ID-006 — accès temporaire des comptes Identity.
-- La fenêtre suit [access_valid_from, access_valid_until) et reste optionnelle.
-- Les gardes Identity la relisent en base à chaque login/introspection afin
-- qu'un JWT déjà émis ne puisse pas dépasser l'expiration administrative.

USE foot;

ALTER TABLE `User`
  ADD COLUMN access_valid_from DATETIME NULL AFTER isActive,
  ADD COLUMN access_valid_until DATETIME NULL AFTER access_valid_from;
-- Migration : icônes PWA personnalisables par club, dans le prolongement de
-- add_team_branding.sql. Consommées par teamManager (src/app/manifest.ts) :
-- absence de valeur = icônes par défaut statiques (public/icons/*), comme
-- avant cette migration.

USE foot;

ALTER TABLE team_branding
  ADD COLUMN icon_192_url TEXT NULL AFTER favicon_url,
  ADD COLUMN icon_512_url TEXT NULL AFTER icon_192_url;

-- Migration : scoping multi-club réel de sellerPortal (V1 était mono-club
-- en pratique, voir README § « Portée V1 »). Pour une base déjà bootstrapée
-- avec sql/schema.sql avant cette migration (colonne clubId absente).
--
-- clubId est ajouté NULLABLE ici : les lignes existantes n'ont pas de club
-- connu automatiquement (V1 ne le suivait pas). Avant de pouvoir compter sur
-- ce champ pour filtrer les données par club, un opérateur doit :
--   1) backfiller clubId sur les sp_sellers et sp_product_categories déjà
--      en base (UPDATE manuel vers l'UUID du club réel, ex. Olympique de
--      Béja pour un déploiement V1 mono-club) ;
--   2) puis seulement alors passer clubId en NOT NULL si souhaité
--      (ALTER TABLE ... MODIFY clubId CHAR(36) NOT NULL).
-- L'application (routes d'inscription/catégories) exige déjà clubId pour
-- toute nouvelle écriture — voir src/app/api/auth/register/route.ts et
-- src/app/api/categories/route.ts.

USE foot;

ALTER TABLE sp_sellers
  ADD COLUMN IF NOT EXISTS clubId CHAR(36) NULL COMMENT 'FK logique vers teams.id (base foot partagée, pas de contrainte FK cross-app)' AFTER id,
  ADD KEY IF NOT EXISTS idx_sp_sellers_club (clubId);

ALTER TABLE sp_product_categories
  ADD COLUMN IF NOT EXISTS clubId CHAR(36) NULL COMMENT 'Référentiel géré par l''administration du club, par club (pas global)' AFTER id;

-- L'ancien index unique global sur `slug` doit être remplacé par un index
-- unique (clubId, slug) une fois clubId backfillé — sinon deux clubs ne
-- pourraient jamais avoir chacun une catégorie "maillots". Ignore l'erreur
-- si l'ancien index a déjà été retiré par une exécution précédente.
DROP INDEX IF EXISTS uq_sp_product_categories_slug ON sp_product_categories;
ALTER TABLE sp_product_categories ADD UNIQUE KEY IF NOT EXISTS uq_sp_product_categories_club_slug (clubId, slug);

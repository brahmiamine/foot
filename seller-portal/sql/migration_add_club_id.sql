-- Migration: rattachement club (multi-clubs réel) sur sp_sellers et
-- sp_product_categories. Pour les installations déjà bootstrapées avant
-- l'ajout de club_id dans sql/schema.sql.
--
-- Nullable ici : la contrainte NOT NULL n'a de sens qu'au niveau
-- applicatif pour les nouvelles écritures (voir src/entities/Seller.ts et
-- src/entities/ProductCategory.ts) ; les lignes existantes d'une install
-- mono-club doivent être renseignées manuellement avec le teams.id du club
-- concerné avant de compter dessus pour filtrer une requête.

ALTER TABLE sp_sellers
  ADD COLUMN club_id CHAR(36) NULL AFTER id,
  ADD KEY idx_sp_sellers_club (club_id);

ALTER TABLE sp_product_categories
  ADD COLUMN club_id CHAR(36) NULL AFTER id;

-- L'ancienne contrainte d'unicité globale sur `slug` doit être remplacée
-- par une unicité par club, sinon deux clubs ne peuvent pas avoir chacun
-- une catégorie "maillots". Adapter le nom de la contrainte ci-dessous si
-- l'install a été bootstrapée avec une version antérieure de schema.sql où
-- elle porterait un nom différent.
ALTER TABLE sp_product_categories
  DROP KEY uq_sp_product_categories_slug,
  ADD UNIQUE KEY uq_sp_product_categories_club_slug (club_id, slug);

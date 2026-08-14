-- Migration: traçabilité de la modération club sur sp_products.
-- `rejectionReason` existe déjà dans le schéma initial ; il manquait qui a
-- statué et quand. Alimenté par club-hub (POST /admin/marketplace/products,
-- seul endroit qui a le droit de faire transiter un produit vers
-- APPROVED/REJECTED — voir src/entities/enums.ts,
-- SELLER_ALLOWED_PRODUCT_TRANSITIONS).
--
-- reviewedBy référence logiquement un User.id de club-hub (staff ADMIN du
-- club), pas un sp_seller_users.id : aucune contrainte FK réelle cross-base,
-- comme le reste de l'app (voir migration_add_club_id.sql).

ALTER TABLE sp_products
  ADD COLUMN reviewedBy VARCHAR(191) NULL AFTER rejectionReason,
  ADD COLUMN reviewedAt DATETIME NULL AFTER reviewedBy;

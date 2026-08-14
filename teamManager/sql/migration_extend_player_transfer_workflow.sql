-- migration.md §19 : passage de la v1 create+complete au workflow
-- club source -> club destination -> federation. Additive et compatible
-- avec les lignes existantes : approved_by reste present pour compatibilite,
-- les nouvelles colonnes explicitent les deux validations distinctes.

USE foot;

ALTER TABLE player_transfers
  ADD COLUMN destination_approved_by VARCHAR(191) NULL AFTER approved_by,
  ADD COLUMN destination_approved_at DATETIME NULL AFTER destination_approved_by,
  ADD COLUMN homologated_by VARCHAR(191) NULL AFTER destination_approved_at,
  ADD COLUMN homologated_at DATETIME NULL AFTER homologated_by;

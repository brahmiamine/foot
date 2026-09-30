-- Correction de schéma partagé `User.updatedAt`.
--
-- La colonne provenait d'un schéma Prisma, où la valeur de `updatedAt` est
-- posée côté application : elle était donc NOT NULL SANS valeur par défaut.
-- Or `identity` est bâti sur TypeORM, dont les colonnes `@CreateDateColumn` /
-- `@UpdateDateColumn` ne sont pas envoyées dans l'INSERT et s'appuient sur le
-- défaut de la base. Résultat : toute création de compte Identity (inscription
-- via /api/register, invitations, provisioning, seed super-admin) échouait avec
-- `ER_NO_DEFAULT_FOR_FIELD: Field 'updatedAt' doesn't have a default value`.
--
-- Additif et sans risque pour les clients Prisma : ils continuent de renseigner
-- `updatedAt` explicitement, le défaut n'est utilisé que lorsqu'il est omis.

USE foot;

ALTER TABLE `User`
  MODIFY COLUMN `updatedAt` DATETIME(3) NOT NULL
    DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3);

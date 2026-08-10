-- Migration: Ajouter la colonne app_source à la table audit_logs
-- Permet de savoir quelle app (arbinote, superadmin, matchsheet) a écrit
-- chaque entrée, pour pouvoir fusionner audit_logs avec AuditLog
-- (teamManager) dans une vue d'audit unifiée. Nullable : les lignes
-- historiques n'ont pas cette information et resteront à NULL.

ALTER TABLE `audit_logs`
ADD COLUMN `app_source` VARCHAR(20) NULL AFTER `admin_username`;

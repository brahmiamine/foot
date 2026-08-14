-- Migration: Ajouter 'tournois' au type de compétition des saisons

ALTER TABLE `saisons` 
MODIFY COLUMN `type_competition` ENUM('championnat', 'coupe', 'tournois') NOT NULL DEFAULT 'championnat';


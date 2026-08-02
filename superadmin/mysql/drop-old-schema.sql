-- Script SQL pour supprimer l'ancien schéma avant l'import de arbitres.sql
-- À exécuter avant d'importer arbitres.sql

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS votes;
DROP TABLE IF EXISTS matches;
DROP TABLE IF EXISTS journees;
DROP TABLE IF EXISTS saisons;
DROP TABLE IF EXISTS ligues;
DROP TABLE IF EXISTS federations;
DROP TABLE IF EXISTS teams;
DROP TABLE IF EXISTS arbitres;
DROP TABLE IF EXISTS critere_definitions;
DROP TABLE IF EXISTS contact_messages;

SET FOREIGN_KEY_CHECKS = 1;


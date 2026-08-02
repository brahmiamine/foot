-- Migration SQL : Support des équipes externes dans la table matches
-- Ce script modifie la table matches pour permettre les équipes externes

-- =========================================================================
-- ÉTAPE 1 : Ajouter les colonnes pour les noms d'équipes externes
-- =========================================================================

ALTER TABLE matches
ADD COLUMN home_team_name VARCHAR(150) NULL AFTER home_team_id,
ADD COLUMN away_team_name VARCHAR(150) NULL AFTER away_team_id;

-- =========================================================================
-- ÉTAPE 2 : Remplir les noms d'équipes existants depuis la table teams
-- =========================================================================

UPDATE matches m
INNER JOIN teams ht ON m.home_team_id = ht.id
SET
    m.home_team_name = ht.name_fr;

UPDATE matches m
INNER JOIN teams at ON m.away_team_id = at.id
SET
    m.away_team_name = at.name_fr;

-- =========================================================================
-- ÉTAPE 3 : Supprimer les contraintes de clé étrangère existantes
-- =========================================================================

ALTER TABLE matches
DROP FOREIGN KEY fk_matches_home,
DROP FOREIGN KEY fk_matches_away;

-- =========================================================================
-- ÉTAPE 4 : Rendre les colonnes team_id NULLABLE
-- =========================================================================

ALTER TABLE matches
MODIFY COLUMN home_team_id BIGINT NULL,
MODIFY COLUMN away_team_id BIGINT NULL;

-- =========================================================================
-- ÉTAPE 5 : Recréer les contraintes de clé étrangère avec ON DELETE SET NULL
-- =========================================================================

ALTER TABLE matches
ADD CONSTRAINT fk_matches_home FOREIGN KEY (home_team_id) REFERENCES teams (id) ON DELETE SET NULL,
ADD CONSTRAINT fk_matches_away FOREIGN KEY (away_team_id) REFERENCES teams (id) ON DELETE SET NULL;

-- =========================================================================
-- ÉTAPE 6 : Ajouter des contraintes de validation métier
-- =========================================================================

-- Contrainte : Au moins un des deux (team_id ou team_name) doit être rempli
-- Note: MySQL ne supporte pas les CHECK constraints complexes, donc on gère ça au niveau application
-- Mais on peut ajouter un index pour améliorer les performances

CREATE INDEX idx_matches_home_team ON matches (home_team_id);

CREATE INDEX idx_matches_away_team ON matches (away_team_id);

-- =========================================================================
-- NOTES IMPORTANTES
-- =========================================================================
-- 1. Les contraintes métier suivantes doivent être gérées au niveau application :
--    - Si home_team_id est NULL, alors home_team_name est OBLIGATOIRE
--    - Si away_team_id est NULL, alors away_team_name est OBLIGATOIRE
--    - Au moins un des deux (team_id ou team_name) doit être rempli pour chaque équipe
--
-- 2. Les noms d'équipes existants ont été remplis automatiquement depuis la table teams
--
-- 3. Pour les nouveaux matches avec équipes externes :
--    - Laissez team_id à NULL
--    - Remplissez team_name avec le nom de l'équipe externe
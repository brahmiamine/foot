-- Migration : unification des joueurs sur la table `Player` déjà possédée par
-- clubCard (disciplinaire : cartons/suspensions/amendes/notes). teamManager
-- devient l'endroit où on gère les joueurs (créer/éditer/supprimer) ; clubCard
-- garde uniquement la lecture (cartons, suspensions, amendes, notes, exports).
-- `cms_players` (créée précédemment, jamais utilisée, 0 ligne) est abandonnée.

USE foot;

-- Colonnes additives pour la fiche joueur (photo, poste, date de naissance) —
-- ignorées par clubCard/Prisma qui ne les déclare pas dans son schéma.
ALTER TABLE Player
  ADD COLUMN birthDate DATE NULL,
  ADD COLUMN position VARCHAR(50) NULL,
  ADD COLUMN imageUrl VARCHAR(255) NULL;

-- cms_team_members.player_id pointait vers cms_players (bigint) ; on le fait
-- pointer vers Player (varchar191, même collation que Player.id).
ALTER TABLE cms_team_members
  DROP FOREIGN KEY fk_cms_team_members_player;

ALTER TABLE cms_team_members
  MODIFY player_id VARCHAR(191) COLLATE utf8mb4_unicode_ci NULL;

ALTER TABLE cms_team_members
  ADD CONSTRAINT fk_cms_team_members_player FOREIGN KEY (player_id) REFERENCES Player(id) ON DELETE CASCADE;

-- cms_players n'a jamais eu de données (0 ligne) : suppression sans risque.
DROP TABLE cms_players;

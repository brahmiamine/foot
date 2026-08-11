-- Migration : affiliations supporter (Member <-> Team), séparées du
-- User.teamId réservé aux comptes staff. Voir README racine, section
-- « Billetterie : séparer l'identité du supporter de l'organisateur de
-- l'événement ». Un membre peut suivre 0, N clubs ; cette table n'a aucune
-- incidence sur les autorisations (achat de billet, accès données, etc.).

USE foot;

CREATE TABLE IF NOT EXISTS member_team_affiliations (
  user_id VARCHAR(191) NOT NULL,
  team_id CHAR(36) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, team_id),
  CONSTRAINT fk_member_team_affiliations_user FOREIGN KEY (user_id) REFERENCES User(id) ON DELETE CASCADE,
  CONSTRAINT fk_member_team_affiliations_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

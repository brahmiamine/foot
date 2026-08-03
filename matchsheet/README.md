# matchsheet — feuille de match électronique

Application plein écran, sans authentification, utilisée sur place (tablette/kiosque) pour remplir la feuille de match officielle : composition, cartons, buts, blessures, remplacements, réserves, et signatures des trois acteurs (équipe domicile, équipe extérieure, arbitre) avant et après le match.

Fait partie du même écosystème que `superadmin`, `teamManager` et `arbinote` : mêmes tables partagées (`matches`, `teams`, `Player`, `Card`, `CardReason`, `cms_match_lineups`), même base MariaDB `foot`. La composition (titulaires/remplaçants) est saisie depuis `teamManager` par chaque club ; matchsheet ne fait que la lire.

## Base de données

Deux migrations SQL à exécuter (dans cet ordre, sur la base `foot` déjà utilisée par les autres apps) :

1. `teamManager/sql/migration_add_match_lineups.sql` — si pas déjà appliquée (composition d'équipe, prérequis).
2. `matchsheet/sql/migration_matchsheet_init.sql` — ajoute la colonne `period` à `Card` et crée les tables `ms_sheets`, `ms_signatures`, `ms_goals`, `ms_injuries`, `ms_substitutions`, `ms_reservations`.

## Variables d'environnement

```
DB_HOST=
DB_PORT=3306
DB_USER=
DB_PASSWORD=
DB_NAME=foot
```

## Démarrage

```
npm install
npm run dev
```

L'accueil (`/`) affiche la barre horizontale des matchs des ±3 jours autour d'aujourd'hui. Sélectionner un match ouvre sa feuille (`/[matchId]`), avec accès à :

- `/[matchId]/pre-match` — signatures avant-match (3 acteurs) + réserves avant-match
- `/[matchId]/live` — cartons / buts / blessures / remplacements, avec sélection du temps de jeu (1ère mi-temps, 2e mi-temps, prolongation 1, prolongation 2)
- `/[matchId]/post-match` — signatures après-match (3 acteurs) + réserves après-match + clôture définitive de la feuille

Les cartons enregistrés ici écrivent directement dans la table `Card` partagée : ils sont immédiatement visibles dans le module discipline de `teamManager`.

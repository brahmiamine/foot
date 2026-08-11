# matchsheet — feuille de match électronique

Application plein écran, sans authentification, utilisée sur place (tablette/kiosque) pour remplir la feuille de match officielle : composition, cartons, buts, blessures, remplacements, réserves, et signatures des trois acteurs (équipe domicile, équipe extérieure, arbitre) avant et après le match.

Fait partie du même écosystème que `superadmin`, `teamManager` et `arbinote` : mêmes tables partagées (`matches`, `teams`, `Player`, `Card`, `CardReason`, `cms_match_lineups`), même base MariaDB `foot`. La composition (titulaires/remplaçants) est saisie depuis `teamManager` par chaque club ; matchsheet ne fait que la lire.

## Base de données

Trois migrations SQL à exécuter (dans cet ordre, sur la base `foot` déjà utilisée par les autres apps) :

1. `teamManager/sql/migration_add_match_lineups.sql` — si pas déjà appliquée (composition d'équipe, prérequis).
2. `matchsheet/sql/migration_matchsheet_init.sql` — ajoute la colonne `period` à `Card` et crée les tables `ms_sheets`, `ms_signatures`, `ms_goals`, `ms_injuries`, `ms_substitutions`, `ms_reservations`.
3. `matchsheet/sql/migration_matchsheet_officials_controls.sql` — crée `ms_match_officials` (infos arbitre) et `ms_player_controls` (contrôles d'identité/licences).

## Variables d'environnement

```
cp .env.example .env.local
```

`matchsheet` est un kiosque sans écran de login, mais `src/middleware.ts` et
`src/lib/ssoSession.ts` vérifient tout de même le cookie SSO partagé pour les
routes qui en ont besoin — les variables `SSO_*` doivent être identiques aux
autres apps (voir `sso/.env.example`). Voir `.env.example` pour la liste
complète (DB, SSO, `notification-api`).

## Démarrage

```
npm install
npm run dev
```

L'accueil (`/`) affiche la barre horizontale des matchs des ±3 jours autour d'aujourd'hui. Sélectionner un match ouvre sa feuille (`/[matchId]`), avec accès à :

- `/[matchId]/officials` — **infos arbitre** : arbitre central, assistants 1/2, 4e arbitre, délégué principal (nom + n° de licence). Les 4 postes obligatoires (centre, assistants, délégué) doivent être validés avant de pouvoir confirmer l'avant-match.
- `/[matchId]/controls` — **contrôles** : liste des deux compositions avec case à cocher par joueur (contrôle du numéro de maillot / de l'identité) et champ de note libre.
- `/[matchId]/pre-match` — signatures avant-match (3 acteurs) + réserves avant-match
- `/[matchId]/live` — cartons / buts / blessures / remplacements, avec sélection du temps de jeu (1ère mi-temps, 2e mi-temps, prolongation 1, prolongation 2)
- `/[matchId]/post-match` — signatures après-match (3 acteurs) + réserves après-match + clôture définitive de la feuille

Les cartons enregistrés ici écrivent directement dans la table `Card` partagée : ils sont immédiatement visibles dans le module discipline de `teamManager`.

## PWA

`manifest.json` + `public/sw.js` (app shell : cache des assets statiques,
page `offline.html` de secours pour la navigation — les appels `/api/*` ne
sont jamais mis en cache, le live doit toujours venir du réseau), icônes
dans `public/icons/`, bannière d'installation (`PwaInstallPrompt.tsx`) —
voir [`../roadmap.md`](../roadmap.md) § 3. Pas de synchronisation offline
des écritures (composition, événements live, signatures) : la saisie
nécessite toujours une connexion active (voir `../manquants.md`).

## Charte graphique et bilinguisme

Couleur primaire rouge/blanc (FTF) : `$primary` pointe vers `$ftf-red` (`#ce1126`) dans `src/assets/scss/_variables.scss`, ce qui rebranding automatiquement boutons, badges et liens Bootstrap dérivés.

Un bouton de langue (haut droit, FR/AR) bascule l'affichage des noms de joueurs entre `firstNameFr`/`lastNameFr` et `firstNameAr`/`lastNameAr` (repli sur le FR si le nom arabe n'est pas renseigné) et positionne `dir="rtl"` sur `<html>`. État tenu en mémoire côté client (`src/lib/i18n/LanguageContext.tsx`), sans persistance disque : le kiosque reste ouvert sur une session continue.

## Hors périmètre (volontairement)

Cette app reste un kiosque plein écran **sans authentification** : la preuve de présence est la signature elle-même, pas un compte utilisateur. Ne font donc pas partie de ce projet (gérés par `superadmin`/`teamManager`/`arbinote`) :

- comptes/rôles type FootClubs et gestion des droits FMI par équipe ;
- mot de passe de match par équipe/arbitre ;
- fonctionnement hors-ligne avec file de synchronisation (PWA).

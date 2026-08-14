# medical-hub

Espace médical du club (médecin, kiné) : blessures en cours, joueurs
indisponibles, alertes de retour, disponibilités, documents, historique et
suivi quotidien — sur la table `cms_injuries` déjà possédée par
[`club-hub`](../club-hub), avec un accès **strictement réservé** à la
permission `medical.view`/`medical.manage` (`cms_roles`/`cms_user_roles`,
déjà en place côté club-hub).

## Pourquoi une app séparée

Le module médical de club-hub est volontairement exclu du preset "Secrétaire
Général" et des rôles Coach/Adjoint (voir
`club-hub/src/lib/permissions.ts`, `DEFAULT_ROLE_PRESETS`) : un dossier de
blessure contient un diagnostic et des documents, que ni le staff technique
ni l'administration générale n'ont vocation à voir en détail. `player-hub`
et `staff-hub` n'exposent qu'un **statut simplifié**
(disponible/blessé/suspendu), jamais ces champs — `medical-hub` est le seul
endroit qui les affiche, à ceux qui ont explicitement la permission.

**Aucun changement identity/auth-shared** ici non plus (même situation que
`staff-hub`) : le compte est un compte staff club standard (`ADMIN`/
`OBSERVATEUR` via SSO), avec un rôle club-hub qui porte la permission
`medical.*`.

## Provisionnement

Rien de spécifique : un compte médecin/kiné est un compte staff comme un
autre, créé dans club-hub (Utilisateurs), avec un rôle (Rôles &
permissions) qui inclut `medical.view`/`medical.manage` — à créer côté
club-hub si l'un des rôles standards ne l'a pas déjà (aucun des presets
`DEFAULT_ROLE_PRESETS` actuels ne l'inclut).

## Démarrage local

```bash
cp .env.example .env.local   # puis renseigner DB_*, SSO_URL, NOTIFICATION_API_URL
pnpm install
pnpm dev   # http://localhost:3009
```

## Périmètre de cette implémentation

Inclus : tableau de bord, joueurs indisponibles, blessures en cours (liste
+ création + détail éditable), suivi quotidien (journal texte horodaté,
sans nouvelle table — voir plus bas), alertes (retours dépassés / proches),
disponibilités (vue effectif complet), documents (liste consolidée),
historique (toutes blessures, y compris résolues), notifications.

**Suivi quotidien sans nouveau schéma** : plutôt que d'ajouter une table de
log, chaque entrée de suivi est ajoutée en tête du champ `notes` existant
de `cms_injuries`, préfixée d'une date et de l'auteur (voir
`services/MedicalPortalService.appendFollowUpNote`). Reste additif et
n'affecte aucune autre app qui lit cette table.

Volontairement laissé de côté : upload de fichier réel pour les documents
(le formulaire attend une URL déjà hébergée ailleurs, pas de stockage
propre à cette app), et un vrai "protocole de reprise" structuré par étapes
(les champs `progressiveReturn`/`progressiveReturnNotes` déjà présents sur
`Injury` couvrent le besoin minimal).

## Design

Même système que `player-hub`/`staff-hub`/`seller-portal` (`--mh-*` dans
`src/app/globals.css`).

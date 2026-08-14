# staff-hub

Espace staff technique générique multi-clubs (coach, adjoint, analyste,
préparateur...) : effectif, calendrier, entraînements, présences, matchs,
convocations, composition, planches tactiques, statistiques et
déplacements — sur les **mêmes données et le même RBAC** que
[`club-hub`](../club-hub) (`cms_roles`/`cms_user_roles`, déjà en place),
avec une interface plus opérationnelle que le back-office administratif
complet.

## Différence avec club-hub

`club-hub` reste le poste de pilotage administratif du club (utilisateurs,
rôles, boutique, sponsors, académie, billetterie, réglages...). `staff-hub`
est l'outil quotidien du staff technique : mêmes comptes (`ADMIN`/
`OBSERVATEUR` via SSO), mêmes rôles/permissions (`cms_roles`), mais un menu
réduit aux modules pertinents pour un coach/adjoint/analyste/préparateur, et
sans les écrans hors de son périmètre (utilisateurs, boutique, sponsors...).

**Aucun changement identity/auth-shared n'était nécessaire** pour cette app
(contrairement à `player-hub`, qui a introduit le rôle `PLAYER`) : le staff
se connecte exactement comme dans `club-hub`, avec le même compte.

## Provisionnement

Rien de spécifique : un compte staff est créé/géré dans `club-hub`
(Utilisateurs, Rôles & permissions), comme aujourd'hui. `staff-hub` ne fait
que lire cette même base de comptes et de rôles.

## Démarrage local

```bash
cp .env.example .env.local   # puis renseigner DB_*, SSO_URL, NOTIFICATION_API_URL
pnpm install
pnpm dev   # http://localhost:3008
```

## Périmètre de cette implémentation

Inclus : tableau de bord, effectif (lecture), calendrier, entraînements
(création + invitation de l'effectif + présences), présences (rapport),
matchs (lecture + création de match amical), convocations (création +
suivi des réponses), composition (formation + titulaires/remplaçants,
tableau plutôt qu'éditeur graphique glisser-déposer), planches tactiques
(lecture seule — l'éditeur graphique reste dans club-hub), statistiques
(lecture + saisie), déplacements (création + ajout de l'effectif + suivi
des réponses de transport), notifications.

Volontairement laissé de côté pour cette itération : édition de fiche
joueur/staff (reste dans club-hub), gestion des véhicules de déplacement
(`cms_trip_vehicles`), éditeur graphique de planches tactiques.

## Design

Même système que `player-hub`/`seller-portal` (`--sh-*` dans
`src/app/globals.css`), pas le Bootstrap/Skote de `club-hub` — cohérence
visuelle entre les apps « portail » du dépôt.

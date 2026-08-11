# billetterie — billetterie générique multi-clubs

Application Next.js indépendante permettant à un supporter (compte `MEMBER`
authentifié via `sso`) d'acheter un billet pour un match, quel que soit le
club organisateur. Voir README racine, section « Billetterie : séparer
l'identité du supporter de l'organisateur de l'événement » pour le modèle
de données complet et son raisonnement.

## Principes

- **Pas de table Event dupliquée** : l'« événement », c'est la table
  `matches` déjà partagée (gérée par `superadmin`/`teamManager`). Cette app
  ne fait qu'y ajouter des catégories de billets et des ventes, préfixées
  `tk_` (`sql/schema.sql`).
- **Le club organisateur, pas l'acheteur** : un billet porte
  `organizerTeamId` (copie de `matches.equipe_home` au moment de l'achat).
  L'acheteur peut être supporter de n'importe quel club, ou d'aucun — voir
  `sso` § affiliations supporter. Aucune donnée `User.teamId`/affiliation
  n'est utilisée pour restreindre un achat, **sauf** via une
  `TicketSaleRule` explicite (catégorie réservée aux supporters
  domicile/visiteurs), configurée par club organisateur.
- **Catégories dynamiques par club** (`tk_ticket_categories`) : pas d'enum
  fixe `GRADIN`/`CHAISE` dans le code. Chaque club définit son propre
  référentiel, réutilisable d'un match à l'autre via
  `tk_match_ticket_categories` (qui porte le prix/quota propres à ce match).
- **Résolution serveur systématique** : `matchTicketCategoryId` est le seul
  identifiant reçu du client à l'achat (`POST /api/match/[id]/purchase`) —
  prix, quota, fenêtre de vente et éligibilité d'audience sont entièrement
  recalculés côté serveur dans une transaction avec verrou pessimiste
  (`src/lib/tickets.ts`), jamais déduits d'une valeur envoyée par le
  frontend.

## Ce qui n'est PAS fait dans cette itération

- **Pas d'intégration paiement réelle** : un achat est marqué `PAID`
  directement (voir `Ticket.status`, point d'extension prévu pour brancher
  `payment-api` plus tard sans changer le modèle).
- **Pas de contrôle billetterie / scanner** : c'est une application séparée
  (`ticketing-scanner`), hors périmètre de cette normalisation (voir README
  racine).
- **Pas d'administration des catégories/quotas dans cette app** : les
  lignes `tk_ticket_categories`/`tk_match_ticket_categories`/
  `tk_ticket_sale_rules` doivent aujourd'hui être créées manuellement (SQL
  ou script de seed) — pas d'UI d'administration encore. Un club voudra
  probablement gérer ça depuis `teamManager` à terme.
- **Pas de QR code / preuve d'entrée** : `Ticket.reference` est un code
  humainement lisible, pas encore matérialisé en QR ni vérifié par un
  scanner.

## Démarrage

```bash
cp .env.example .env.local   # renseigner DB_*, SSO_JWT_SECRET, SSO_COOKIE_NAME, SSO_URL
npm install
# importer sql/schema.sql dans la base "foot" partagée (une seule fois)
mariadb -h 127.0.0.1 -P 3307 -u "$DB_USER" -p foot < sql/schema.sql
npm run dev
```

Il n'y a pas encore de script de seed : pour tester, insérer manuellement
une ligne dans `tk_ticket_categories` (clubId = un club existant de
`teams`), une ligne dans `tk_match_ticket_categories` (matchId = un match
`UPCOMING`/`is_public_visible=1` existant de `matches`) avec un prix et une
capacité, puis se connecter avec un compte `MEMBER` sur `sso` avant
d'acheter.

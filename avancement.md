# Avancement — audit fonctionnel de l'écosystème `foot`

## Contexte

Ce document liste les fonctionnalités et processus **pas encore implémentés**
dans le dépôt `foot` (11 apps partageant la base MariaDB `foot`), vérifiés
directement sur le code — pas recopiés d'un historique. Les correctifs déjà
livrés ne sont plus détaillés ici (voir l'historique git et les README de
chaque app pour le détail de ce qui a été fait) : ce fichier ne garde que ce
qui reste à faire, pour rester utilisable comme backlog.

État vérifié sur le code au 12/08/2026.

---

## Backlog par priorité

| Rang | Action | Portée |
|---|---|---|
| 1 | `teamManager` : facturation sponsors, finance/trésorerie, RGPD, espace supporter/communauté | Produit — boutique client avec paiement réel livrée, reste des gros lots à traiter, voir détail par app |
| 2 | `billetterie` : scanner de contrôle d'accès au stade | Produit — v1 en place (QR signé, marquage USED, double scan, journal d'entrée) ; mode offline et lecture caméra restent à faire |
| 3 | Passerelle API unique + domaines de production | Infra — à déclencher au déploiement réel |
| 4 | Boucles fermées post-annulation (remboursements, avoirs, notification métier) | Paiement/Billetterie — webhook post-paiement fermé (payment-api → billetterie), remboursements toujours absents |
| 5 | Gouvernance des notifications émettrices (catalogue d'événements, destinataires, templates, monitoring) | Plateforme — `notification-api` est prêt mais plusieurs apps ne publient rien |

---

## Circuits inter-projets à fermer

Ces points ne sont pas seulement des fonctionnalités isolées : ce sont des
flux qui traversent plusieurs projets et qui restent incomplets, fragiles ou
non audités de bout en bout.

### Référentiel sportif → feuille de match → résultats publics
- `superadmin` crée les fédérations/ligues/saisons/journées/matchs et
  `matchsheet` fait évoluer `matches.status` vers `IN_PROGRESS`/`FINISHED` ;
  le statut `CANCELLED` existe côté `superadmin`. Le flux n'est pas complètement
  fermé parce qu'une annulation ne déclenche pas encore la cascade métier
  attendue : fermeture/gel de la feuille, arrêt des ventes, remboursement ou
  avoir des billets déjà payés, message aux acheteurs, trace métier unique.
- La réouverture d'une feuille clôturée est désormais un processus contrôlé :
  `superadmin` (`POST /api/admin/matches/[id]/reopen`, bouton "Rouvrir" sur
  un match Terminé) exige un motif, remet `matches.status` et
  `ms_sheets.status` à `IN_PROGRESS` (feuille de nouveau modifiable), notifie
  les deux clubs et journalise l'action dans `audit_logs` (`action: 'reopen'`,
  horodatée). Restreint aux matchs `FINISHED` avec feuille `CLOSED`.
- Les données live (`goals`, `cards`, `injuries`, `substitutions`) alimentent
  `ob` en lecture, mais il n'existe pas de contrat d'API/versionnement entre
  `matchsheet` et les frontends publics. Un changement de schéma partagé peut
  casser le live sans garde automatisée.

### Billetterie / paiement / contrôle d'accès
- Le parcours achat : `billetterie` crée une réservation `PENDING`, appelle
  `payment-api`, puis réconcilie soit via le webhook applicatif signé
  `payment-api → billetterie` (`POST /api/payments/webhook`, HMAC-SHA256,
  déclenché dès que le paiement passe PAID côté `payment-api`), soit au
  retour navigateur ou sur `/mes-billets` en secours. Dans les deux cas le
  corps du webhook n'est jamais source de vérité : billetterie relit
  `GET /payments/:id` avant de marquer les billets PAID. Reste manquant :
  file d'événement/retry persistant au-delà des 2 tentatives en mémoire de
  `payment-api`, et les autres apps appelantes de `payment-api` (`ob`,
  `teamManager`, `sellerPortal`…) n'ont pas d'URL configurée dans
  `WEBHOOK_URLS` — elles restent en polling pur tant que ça n'est pas fait.
- Le contrôle d'accès au stade a une v1 : QR signé par billet (`jose` HS256,
  `src/lib/ticketQr.ts`, affiché sur `/mes-billets` pour les billets `PAID`),
  scan admin (`/admin/scan`, `POST /api/admin/tickets/scan`) qui relit le
  statut réel en base, marque `USED` + horodate, détecte le double scan
  (`ALREADY_USED`) et journalise chaque tentative — succès ou refus — dans
  `tk_ticket_scans` (`src/entities/TicketScanLog.ts`, "journal d'entrée").
  Volontairement hors périmètre de cette v1 : pas de lecture caméra dans le
  navigateur (scan pensé pour une douchette QR/code-barres en mode clavier,
  ou collage manuel du contenu), pas de mode offline (le scan exige une
  connexion à la base à chaque passage), pas de sélection de match par
  gate — le nom des équipes/catégorie s'affiche pour vérification visuelle
  du staff plutôt qu'un blocage automatique par événement.
- L'annulation d'un match n'est pas reliée à `payment-api` : remboursements,
  avoirs, notifications aux acheteurs et rapprochement comptable restent à
  concevoir.

### Notifications plateforme
- `notification-api` centralise préférences, templates, queue et canaux, mais
  chaque application métier doit encore décider quoi émettre. Le catalogue
  d'événements inter-projets n'est pas figé : paiements confirmés existent,
  mais convocations/compositions/sponsors, billetterie, marketplace,
  modération de votes, sécurité SSO et actions `superadmin` ne sont pas tous
  branchés avec des `eventId` idempotents.
- Les modules de notification internes de certaines apps (`teamManager`,
  `sellerPortal`) coexistent avec `notification-api`. Il manque une règle de
  gouvernance : ce qui reste local, ce qui devient notification plateforme,
  comment éviter les doublons in-app/email/push.
- Les canaux push Web et FCM (mobile natif, HTTP v1) fonctionnent pour les
  apps branchées, mais le SMS reste un stub. Les notifications critiques qui
  exigent SMS ne doivent donc pas être promises commercialement, et FCM
  reste à valider avec un vrai compte de service Firebase (jamais testé en
  conditions réelles ici, faute de credentials).

### Marketplace / boutique / seller portal
- `teamManager` a désormais un tunnel d'achat client complet pour sa
  boutique catalogue (`/boutique/[teamId]` : panier, paiement réel via
  `payment-api`, décrément de stock atomique, webhook + retour payeur,
  suivi de commande) — voir la section `teamManager` ci-dessous pour le
  détail. `sellerPortal` reste séparé (vendeurs/produits/commandes `sp_*`,
  toujours pas d'intégration `payment-api`) : il n'existe toujours pas de
  frontend d'achat marketplace unifié entre les deux, ni de circuit
  vendeur → payout fermé côté `sellerPortal`.
- `sellerPortal` utilise une session propre (`SP_JWT_SECRET`) au lieu du SSO
  commun. C'est assumé pour des vendeurs externes, mais les circuits de
  révocation, MFA, audit sécurité et notifications plateforme ne sont pas
  alignés avec le reste de l'écosystème.
- Les payouts affichés côté vendeur restent déclaratifs/lecture seule : aucun
  déclenchement de virement, aucune preuve de paiement vendeur, aucun rapprochement
  avec `payment-api` ou une comptabilité.

### Données partagées / migrations / déploiement
- Les migrations SQL restent physiquement dispersées dans les apps (`sql/`,
  `mysql/`, `migrations/`), mais `db/migrate.sh` + `db/migrations.manifest`
  donnent désormais un ordre d'application reproductible et une table de
  version globale (`schema_migrations`) par-dessus, sans déplacer les
  fichiers existants (voir db/migrate.sh pour ce qui est volontairement
  exclu : dumps complets, scripts destructifs, données de seed). Logique de
  suivi/idempotence testée via un harnais qui simule `docker`/`mariadb`,
  jamais exécuté contre un vrai `mariadb_container` — à valider une fois en
  conditions réelles (`--baseline` d'abord sur une base de dev existante).
- Les tables `Card` et `matches.status` montrent que plusieurs apps peuvent
  écrire ou dépendre d'un même domaine. Il manque des tests de contrat
  inter-projets et des validations CI qui vérifient qu'une évolution de schéma
  reste compatible avec les consommateurs.
- Les domaines publics, le reverse proxy/API gateway, les secrets de production,
  les backups/restores et le monitoring des `/health` restent hors repo. Le
  produit peut démarrer localement, mais le processus d'exploitation complet
  n'est pas fermé.

---

## Reste à faire, par projet

### `teamManager`
- Boutique client avec paiement réel en place : `/boutique` (annuaire des
  clubs ayant des articles en vente) → `/boutique/[teamId]` (catalogue,
  panier côté client en `localStorage`, un panier ne peut jamais mélanger
  deux clubs) → paiement via `payment-api` (même client que billetterie,
  `PAYMENT_PROVIDER` configurable). Réservation/décrément de stock atomique
  par produit (verrou pessimiste, même stratégie que
  `MatchTicketCategory.soldCount` côté billetterie), commande `PENDING` →
  `PAID`/`CANCELLED` via webhook signé + retour payeur + rattrapage
  opportuniste (`ShopOrderService.ts`), scheduler in-process pour libérer
  les commandes abandonnées (`instrumentation.ts`, même TTL 30 min que
  billetterie). `/boutique/commandes` (client) et `/admin/shop/orders`
  (staff, lecture seule) pour le suivi. Comptes `MEMBER` désormais reconnus
  par cette app (jusqu'ici staff uniquement) — `/boutique` fait sa propre
  vérification de rôle, le garde `/admin`/`/api/admin` reste staff-only.
  Hors périmètre v1 : gestion de livraison/expédition côté staff (juste une
  liste en lecture), remboursement d'une commande déjà payée, variantes de
  produit (taille/couleur). Non vérifié dans un navigateur réel faute de
  MariaDB dans ce bac à sable — validé via `vitest`/`tsc`/build production.
- Pas de facturation sponsors (aucun module comptable) — seule la génération du résumé PDF de convention existe.
- Aucun module finance/trésorerie.
- Aucun module RGPD (consentement, export, suppression de données personnelles).
- Pas de workflow de validation juridique/comptable des conventions sponsor : le PDF généré est un résumé administratif, pas un contrat validé ni facturé.
- Aucun espace supporter/communauté.
- Notifications convocation/composition d'équipe/sponsor non branchées : le destinataire n'est pas un `User` résolvable dans le modèle actuel.

### `matchsheet`
- Pas de synchronisation offline des écritures ni file locale de retry pour les événements live saisis en stade.
- Les 4 services de saisie live (`CardEventService`, `GoalService`, `InjuryService`, `SubstitutionService`) refusent désormais toute écriture quand la feuille est `CLOSED` (`SheetClosedError`, voir `services/sheetGuard.ts`) — jusqu'ici seul `post-match/actions.ts` vérifiait ce statut, laissant les 4 services de saisie live sans aucun garde-fou. Une feuille rouverte par `superadmin` (`IN_PROGRESS`) redevient éditable via ces mêmes services, sans changement de code.

### `superadmin`
- Annulation de match implémentée comme action simple, mais pas comme processus complet (remboursements billetterie, message acheteurs, état de feuille, réactivation encadrée).
- Réouverture d'un match `FINISHED` en place (motif requis, audit horodaté, notification aux clubs — voir circuit "Référentiel sportif" ci-dessus), mais reste un geste manuel au cas par cas : pas de règle produit sur qui peut/doit demander une réouverture, ni de délai limite après lequel un match Terminé ne peut plus être rouvert.

### `arbinote`
- Vote sans compte reposant sur empreinte appareil/cookie — pas de vote authentifié.
- Règles anti-fraude au-delà des anomalies/statistiques déjà en place non décrites/étendues.
- Reste 4 erreurs de lint `react-hooks/set-state-in-effect` (`HomeClient`, `LiveMatchBadge`, `ThemeToggle`, `VotedBadge`) : effets de synchronisation externe (localStorage, timer, détection de montage) où une réécriture "dérivation au rendu" n'est pas un changement sûr à faire sans revue au cas par cas.

### `ob`
- Émet désormais 3 événements métier vers `notification-api` (profil membre modifié, abonnement push ajouté/retiré) depuis `src/app/espace-membre/actions.ts`, seules mutations que `ob` effectue lui-même (le reste du site est en lecture seule sur la base `foot`, les formulaires publics — académie, recrutement, sponsors — sont hébergés côté `teamManager`).
- Pages billets/commandes toujours dépendantes des apps génériques (`billetterie`), pas de tunnel intégré.

### `billetterie`
- Scanner de contrôle d'accès au stade : v1 en place (`/admin/scan`, voir circuit "Billetterie / paiement / contrôle d'accès" ci-dessus) — non vérifié dans un navigateur réel dans ce bac à sable (pas de base MariaDB disponible ici), validé via `vitest`/`tsc`/build production uniquement.
- Audience réservée à l'achat toujours auto-déclarée par conception (tracée et recoupée avec les affiliations `sso` comme signal de modération non bloquant, mais pas un mécanisme d'identité fiable — aucun n'existe dans ce dépôt pour la remplacer).
- Webhook applicatif signé venant de `payment-api` en place (`POST /api/payments/webhook`) ; la reconciliation par retour utilisateur / `/mes-billets` reste le filet de sécurité si le webhook échoue ou n'est pas configuré.

### `payment-api`
- Webhook applicatif signé (`WEBHOOK_URLS` + `PAYMENT_WEBHOOK_SECRET`, HMAC-SHA256, 2 retries en mémoire) vers l'app appelante quand un paiement passe PAID — configuré pour `billetterie` uniquement pour l'instant ; une app absente de `WEBHOOK_URLS` reste sur sa reconciliation par polling existante.
- Pas de remboursements ni de payouts.
- Pas d'état comptable exploitable pour les apps métier (facture/reçu, rapprochement, export compta, avoir/remboursement partiel).
- Notifications limitées à `PAYMENT_SUCCEEDED`, uniquement si `userId` fourni par l'appelant.

### `notification-api`
- Canal SMS non implémenté (`NotImplementedSmsProvider` lève une erreur explicite — décision produit documentée, pas un oubli).
- Plusieurs notifications métier non branchées faute de destinataires résolvables (voir `teamManager` ci-dessus).
- Monitoring/alerting externe absent (agrégation des `/health`, alerte) — suppose un outil externe (Datadog, Uptime Kuma…) à provisionner, rien à câbler côté dépôt tant que ce choix n'est pas fait.

### `sellerPortal`
- Authentification vendeur séparée du SSO : pas de MFA, pas de révocation centrale, pas de viewer sécurité partagé.
- Paiement direct, transporteur/logistique, payout automatique, enchères, abonnement publicité vendeur : tous hors périmètre actuel.
- Dépendance temporaire aux tables `sp_*` dans la base partagée `foot`, en attendant une éventuelle Marketplace API dédiée.
- Pas d'intégration `payment-api`/`notification-api` pour le cycle commande vendeur (paiement client, confirmation commande, notification vendeur, payout).

### Infra / `db`
- `db/backup.sh`/`db/restore.sh` existent (dump `mariadb-dump` compressé de `foot` + archive des dossiers `public/uploads` d'arbinote/superadmin/teamManager, restauration avec confirmation). Logique testée via un harnais qui simule `docker`/`mariadb` (round-trip dump→gzip→restore et tar→untar vérifiés), mais jamais exécutés contre un vrai `mariadb_container` avec de vraies données — à valider une fois en conditions réelles avant de s'y fier en production.
- Aucune passerelle API unique, aucun domaine de production configuré.
- Séparation des bases par domaine partielle (`payment-api`/`notification-api` isolées, le reste partage encore `foot`).
- Monitoring/alerting des healthchecks absent.
- Modèle multi-club toujours partiel : un compte staff (`User.teamId`) reste lié à un seul club (les affiliations `sso` ne couvrent que les `MEMBER`).

---

## Note sur la documentation elle-même

Ce fichier remplace l'ancien suivi détaillé (historique des correctifs déjà
livrés, table des circuits inter-projets avec narration complète) : ce
contenu reste consultable dans l'historique git si besoin de contexte sur
*comment* un point a été traité. Ici, seul ce qui reste ouvert est conservé,
pour que le document reste un backlog exploitable plutôt qu'un journal.

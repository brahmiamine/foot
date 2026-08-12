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
| 1 | `teamManager` : boutique client (checkout/paiement réel), facturation sponsors, finance/trésorerie, RGPD, espace supporter/communauté | Produit — gros lots, voir détail par app |
| 2 | `billetterie` : scanner de contrôle d'accès au stade | Produit — jamais commencé |
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
- La réouverture d'une feuille clôturée n'est pas modélisée : pas d'état
  `REOPENED`, pas de motif, pas d'approbation `superadmin`, pas d'audit
  horodaté. Toute correction post-match reste donc une opération technique,
  pas un processus métier contrôlé.
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
- Le contrôle d'accès au stade n'existe pas : pas d'app scanner, pas de QR code
  signé/rotation, pas d'état `USED` horodaté, pas de journal d'entrée, pas de
  mode offline scanner, pas de détection de double scan.
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
- `teamManager` administre une boutique catalogue legacy et `sellerPortal`
  administre des vendeurs/produits/commandes `sp_*`, mais il n'existe pas de
  frontend d'achat marketplace unifié ni de service marketplace commun. Le
  circuit client « voir un produit → payer → commande → stock → vendeur →
  payout » n'est pas fermé.
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
- Pas de checkout/paiement réel pour la boutique client (seule la gestion admin du catalogue existe, `admin/shop/`) — aucun tunnel d'achat, aucun appel à `payment-api`.
- Pas de facturation sponsors (aucun module comptable) — seule la génération du résumé PDF de convention existe.
- Aucun module finance/trésorerie.
- Aucun module RGPD (consentement, export, suppression de données personnelles).
- Pas de workflow de validation juridique/comptable des conventions sponsor : le PDF généré est un résumé administratif, pas un contrat validé ni facturé.
- Aucun espace supporter/communauté.
- Notifications convocation/composition d'équipe/sponsor non branchées : le destinataire n'est pas un `User` résolvable dans le modèle actuel.

### `matchsheet`
- Pas de synchronisation offline des écritures ni file locale de retry pour les événements live saisis en stade.
- Réouverture d'une feuille après clôture non modélisée ni auditée (pas de raison de réouverture tracée).

### `superadmin`
- Annulation de match implémentée comme action simple, mais pas comme processus complet (remboursements billetterie, message acheteurs, état de feuille, réactivation encadrée).

### `arbinote`
- Vote sans compte reposant sur empreinte appareil/cookie — pas de vote authentifié.
- Règles anti-fraude au-delà des anomalies/statistiques déjà en place non décrites/étendues.
- Reste 4 erreurs de lint `react-hooks/set-state-in-effect` (`HomeClient`, `LiveMatchBadge`, `ThemeToggle`, `VotedBadge`) : effets de synchronisation externe (localStorage, timer, détection de montage) où une réécriture "dérivation au rendu" n'est pas un changement sûr à faire sans revue au cas par cas.

### `ob`
- N'émet aucun événement métier vers `notification-api` (reste un émetteur muet, en lecture seule) hors actions espace membre qui consomment les notifications existantes.
- Pages billets/commandes toujours dépendantes des apps génériques (`billetterie`), pas de tunnel intégré.

### `billetterie`
- Scanner de contrôle d'accès au stade : jamais commencé, aucun dossier/route dans le dépôt.
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

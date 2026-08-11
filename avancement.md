# Avancement — audit fonctionnel de l'écosystème `foot`

## Contexte

Ce document liste les fonctionnalités et processus **pas encore implémentés**
dans le dépôt `foot` (11 apps partageant la base MariaDB `foot`), vérifiés
directement sur le code — pas recopiés d'un historique. Les correctifs déjà
livrés ne sont plus détaillés ici (voir l'historique git et les README de
chaque app pour le détail de ce qui a été fait) : ce fichier ne garde que ce
qui reste à faire, pour rester utilisable comme backlog.

État vérifié sur le code au 11/08/2026.

---

## Backlog par priorité

| Rang | Action | Portée |
|---|---|---|
| 1 | Backup/restauration testée pour la base `foot` et les uploads | Infra — aucune stratégie au-delà du volume Docker local |
| 2 | `teamManager` : boutique client (checkout/paiement réel), facturation sponsors, finance/trésorerie, RGPD, espace supporter/communauté | Produit — gros lots, voir détail par app |
| 3 | Propagation de la révocation de session (`tokenVersion`) aux 6 apps clientes de `sso` | Sécurité — décision d'architecture (vérification DB/cache partagé vs TTL court) |
| 4 | `superadmin` : synchronisation live API-Football (colonnes de matching, job, écran de mapping) | Produit |
| 5 | `billetterie` : scanner de contrôle d'accès au stade | Produit — jamais commencé |
| 6 | Passerelle API unique + domaines de production | Infra — à déclencher au déploiement réel |

---

## Reste à faire, par projet

### `sso`
- Révocation de session (`tokenVersion`) vérifiée uniquement dans `sso` lui-même : un JWT « révoqué » reste valide jusqu'à 12h dans les 6 apps clientes (`arbinote`, `matchsheet`, `superadmin`, `teamManager`, `ob`, `billetterie`), qui ne vérifient que signature/expiration (`packages/auth-shared`, volontairement sans DB pour rester Edge-safe). Étendre la vérification demanderait un appel DB par requête authentifiée dans 6 apps déployées indépendamment, ou un mécanisme différent (cache partagé, révocation courte) — décision à prendre consciemment.
- Pas de viewer admin pour le journal de sécurité (`security_events`) : table interrogeable directement seulement.

### `teamManager`
- Pas de checkout/paiement réel pour la boutique client (seule la gestion admin du catalogue existe, `admin/shop/`) — aucun tunnel d'achat, aucun appel à `payment-api`.
- Pas de facturation sponsors (aucun module comptable) — seule la génération du résumé PDF de convention existe.
- Aucun module finance/trésorerie.
- Aucun module RGPD (consentement, export, suppression de données personnelles).
- Aucun espace supporter/communauté.
- Notifications convocation/composition d'équipe/sponsor non branchées : le destinataire n'est pas un `User` résolvable dans le modèle actuel.
- `Card` a deux écrivains (`teamManager` en discipline, `matchsheet` en live) sans verrou de concurrence ni propriétaire unique désigné.

### `matchsheet`
- Pas de tests automatisés.
- Pas de synchronisation offline des écritures.
- Réouverture d'une feuille après clôture non modélisée ni auditée (pas de raison de réouverture tracée).
- Pas de mot de passe de match/compte FMI dédié (app kiosque sans authentification).
- Concurrence sur `Card` avec `teamManager` (voir ci-dessus) à encadrer.

### `superadmin`
- Colonnes de matching API-Football (`api_football_id`/`fixture_id`, live score/minute) absentes du schéma.
- Aucun job de synchronisation live, aucun écran de mapping équipes/fixtures.
- Icônes PWA personnalisables par club absentes de `ClubBranding`.
- PWA orpheline : `public/manifest.json`/`sw.js` existent mais ne sont référencés nulle part dans `src/app` — aucun service worker n'y est jamais enregistré côté navigateur.
- Dette de lint pré-existante (~11 erreurs, essentiellement `@typescript-eslint/no-explicit-any`), rendue visible par la CI mais pas corrigée.

### `arbinote`
- Intégration API-Football encore limitée par le mapping live (dépend du rang `superadmin` ci-dessus).
- Vote sans compte reposant sur empreinte appareil/cookie — pas de vote authentifié.
- Règles anti-fraude au-delà des anomalies/statistiques déjà en place non décrites/étendues.
- Dette de lint pré-existante (~106 erreurs, essentiellement `@typescript-eslint/no-explicit-any`, + quelques `setState` synchrone dans un effet React), rendue visible par la CI mais pas corrigée.

### `ob`
- Pas de PWA installable.
- N'émet aucun événement métier vers `notification-api` (reste un émetteur muet, en lecture seule).
- Pages billets/commandes toujours dépendantes des apps génériques (`billetterie`), pas de tunnel intégré.

### `billetterie`
- Scanner de contrôle d'accès au stade : jamais commencé, aucun dossier/route dans le dépôt.
- Pas de tests automatisés.
- Audience réservée à l'achat toujours auto-déclarée par conception (tracée et recoupée avec les affiliations `sso` comme signal de modération non bloquant, mais pas un mécanisme d'identité fiable — aucun ne existe dans ce dépôt pour la remplacer).
- Aucun écran d'administration ne consomme le signal `audienceMismatch` aujourd'hui.

### `payment-api`
- Pas de callback/webhook applicatif vers les apps métier (seuls les providers rappellent `payment-api`) — la confirmation reste à la charge de chaque app appelante (polling/reconciliation).
- Pas de remboursements ni de payouts.
- Notifications limitées à `PAYMENT_SUCCEEDED`, uniquement si `userId` fourni par l'appelant.

### `notification-api`
- Canal SMS non implémenté (`NotImplementedSmsProvider` lève une erreur explicite — décision produit documentée, pas un oubli).
- Canal FCM (mobile natif) toujours un stub (`FcmProvider`), intégration HTTP v1 Firebase non faite.
- Plusieurs notifications métier non branchées faute de destinataires résolvables (voir `teamManager` ci-dessus).
- Monitoring/alerting externe absent (agrégation des `/health`, alerte) — suppose un outil externe (Datadog, Uptime Kuma…) à provisionner, rien à câbler côté dépôt tant que ce choix n'est pas fait.

### `sellerPortal`
- Pas de tests automatisés.
- Paiement direct, transporteur/logistique, payout automatique, enchères, abonnement publicité vendeur : tous hors périmètre actuel.
- Dépendance temporaire aux tables `sp_*` dans la base partagée `foot`, en attendant une éventuelle Marketplace API dédiée.

### Infra / `db`
- Sauvegarde/restauration de `foot` et des uploads jamais testée (au-delà du volume Docker local).
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

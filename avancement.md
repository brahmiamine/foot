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
| 4 | `billetterie` : scanner de contrôle d'accès au stade | Produit — jamais commencé |
| 5 | Passerelle API unique + domaines de production | Infra — à déclencher au déploiement réel |
| 6 | Outillage de migrations partagé et ordre d'application des scripts SQL | Infra/DB — scripts dispersés par app, pas de migrateur unique |
| 7 | Boucles fermées post-paiement et post-annulation (billets, remboursements, notification métier) | Paiement/Billetterie — reconciliation par polling, pas de callback applicatif ni remboursement |
| 8 | Gouvernance des notifications émettrices (catalogue d'événements, destinataires, templates, monitoring) | Plateforme — `notification-api` est prêt mais plusieurs apps ne publient rien |


---

## Circuits inter-projets à fermer

Ces points ne sont pas seulement des fonctionnalités isolées : ce sont des
flux qui traversent plusieurs projets et qui restent incomplets, fragiles ou
non audités de bout en bout.

### Authentification / révocation SSO
- `sso` émet le cookie JWT commun et sait invalider une session via
  `tokenVersion`, mais les apps clientes vérifient seulement signature,
  issuer et expiration. Le circuit « mot de passe changé / MFA modifiée /
  déconnexion partout → accès coupé partout » n'est donc pas fermé tant que
  `arbinote`, `superadmin`, `teamManager`, `ob`, `billetterie` et les appels
  API publics de `notification-api` n'ont pas un mécanisme de révocation
  partagé (DB/cache/introspection/TTL court).
- L'enrôlement MFA garde le secret TOTP côté navigateur entre `/api/mfa/setup`
  et `/api/mfa/enable`. C'est documenté dans le code et acceptable pour une
  V1, mais le circuit idéal serait un challenge d'enrôlement court, stocké
  serveur, pour éviter de refaire transiter le secret en clair dans le POST
  de confirmation.
- `security_events` existe côté `sso`, mais aucun écran `superadmin` ou outil
  opérationnel ne permet de filtrer les connexions, resets, MFA et révocations
  sans accès SQL direct.

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
- Le parcours achat est partiel : `billetterie` crée une réservation
  `PENDING`, appelle `payment-api`, puis réconcilie par lecture de l'état de
  paiement au retour navigateur ou sur `/mes-billets`. Le circuit
  `payment-api → application appelante` n'existe pas : pas de webhook
  applicatif signé, pas de file d'événement, pas de garantie que l'app métier
  marque rapidement l'achat si l'utilisateur ne revient jamais.
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
- Les canaux push Web fonctionnent pour les apps branchées, mais le FCM natif
  et le SMS sont encore des stubs. Les notifications critiques qui exigent
  mobile natif ou SMS ne doivent donc pas être promises commercialement.

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
- Les migrations SQL restent dispersées dans les apps (`sql/`, `mysql/`,
  `migrations/`) sans outil unique, sans table de versions globale et sans
  ordre d'application reproductible. C'est risqué pour une base `foot`
  partagée par plusieurs écrivains.
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

### `sso`
- Révocation de session (`tokenVersion`) vérifiée uniquement dans `sso` lui-même : un JWT « révoqué » reste valide jusqu'à 12h dans les 6 apps clientes (`arbinote`, `matchsheet`, `superadmin`, `teamManager`, `ob`, `billetterie`), qui ne vérifient que signature/expiration (`packages/auth-shared`, volontairement sans DB pour rester Edge-safe). Étendre la vérification demanderait un appel DB par requête authentifiée dans 6 apps déployées indépendamment, ou un mécanisme différent (cache partagé, révocation courte) — décision à prendre consciemment.
- Pas de viewer admin pour le journal de sécurité (`security_events`) : table interrogeable directement seulement.
- MFA : le secret TOTP d'enrôlement est renvoyé au client puis reposté vers `/api/mfa/enable`; à durcir avec un challenge serveur court et expirant.

### `teamManager`
- Pas de checkout/paiement réel pour la boutique client (seule la gestion admin du catalogue existe, `admin/shop/`) — aucun tunnel d'achat, aucun appel à `payment-api`.
- Pas de facturation sponsors (aucun module comptable) — seule la génération du résumé PDF de convention existe.
- Aucun module finance/trésorerie.
- Aucun module RGPD (consentement, export, suppression de données personnelles).
- Pas de workflow de validation juridique/comptable des conventions sponsor : le PDF généré est un résumé administratif, pas un contrat validé ni facturé.
- Aucun espace supporter/communauté.
- Notifications convocation/composition d'équipe/sponsor non branchées : le destinataire n'est pas un `User` résolvable dans le modèle actuel.
- `Card` a deux écrivains (`teamManager` en discipline, `matchsheet` en live) sans verrou de concurrence ni propriétaire unique désigné.

### `matchsheet`
- Pas de tests automatisés.
- Pas de synchronisation offline des écritures ni file locale de retry pour les événements live saisis en stade.
- Réouverture d'une feuille après clôture non modélisée ni auditée (pas de raison de réouverture tracée).
- Pas de mot de passe de match/compte FMI dédié (app kiosque sans authentification).
- Concurrence sur `Card` avec `teamManager` (voir ci-dessus) à encadrer.

### `superadmin`
- Annulation de match implémentée comme action simple, mais pas comme processus complet (remboursements billetterie, message acheteurs, état de feuille, réactivation encadrée).
- Dette de lint pré-existante (~11 erreurs, essentiellement `@typescript-eslint/no-explicit-any`), rendue visible par la CI mais pas corrigée.

### `arbinote`
- Vote sans compte reposant sur empreinte appareil/cookie — pas de vote authentifié.
- Règles anti-fraude au-delà des anomalies/statistiques déjà en place non décrites/étendues.
- Dette de lint pré-existante (~106 erreurs, essentiellement `@typescript-eslint/no-explicit-any`, + quelques `setState` synchrone dans un effet React), rendue visible par la CI mais pas corrigée.

### `ob`
- Pas de PWA installable.
- N'émet aucun événement métier vers `notification-api` (reste un émetteur muet, en lecture seule) hors actions espace membre qui consomment les notifications existantes.
- Pages billets/commandes toujours dépendantes des apps génériques (`billetterie`), pas de tunnel intégré.

### `billetterie`
- Scanner de contrôle d'accès au stade : jamais commencé, aucun dossier/route dans le dépôt.
- Pas de tests automatisés.
- Audience réservée à l'achat toujours auto-déclarée par conception (tracée et recoupée avec les affiliations `sso` comme signal de modération non bloquant, mais pas un mécanisme d'identité fiable — aucun n'existe dans ce dépôt pour la remplacer).
- Pas de webhook applicatif venant de `payment-api` : la confirmation dépend du retour utilisateur ou d'une reconciliation à la prochaine visite.

### `payment-api`
- Pas de callback/webhook applicatif vers les apps métier (seuls les providers rappellent `payment-api`) — la confirmation reste à la charge de chaque app appelante (polling/reconciliation).
- Pas de remboursements ni de payouts.
- Pas d'état comptable exploitable pour les apps métier (facture/reçu, rapprochement, export compta, avoir/remboursement partiel).
- Notifications limitées à `PAYMENT_SUCCEEDED`, uniquement si `userId` fourni par l'appelant.

### `notification-api`
- Canal SMS non implémenté (`NotImplementedSmsProvider` lève une erreur explicite — décision produit documentée, pas un oubli).
- Canal FCM (mobile natif) toujours un stub (`FcmProvider`), intégration HTTP v1 Firebase non faite.
- Plusieurs notifications métier non branchées faute de destinataires résolvables (voir `teamManager` ci-dessus).
- Monitoring/alerting externe absent (agrégation des `/health`, alerte) — suppose un outil externe (Datadog, Uptime Kuma…) à provisionner, rien à câbler côté dépôt tant que ce choix n'est pas fait.

### `sellerPortal`
- Pas de tests automatisés.
- Authentification vendeur séparée du SSO : pas de MFA, pas de révocation centrale, pas de viewer sécurité partagé.
- Paiement direct, transporteur/logistique, payout automatique, enchères, abonnement publicité vendeur : tous hors périmètre actuel.
- Dépendance temporaire aux tables `sp_*` dans la base partagée `foot`, en attendant une éventuelle Marketplace API dédiée.
- Pas d'intégration `payment-api`/`notification-api` pour le cycle commande vendeur (paiement client, confirmation commande, notification vendeur, payout).

### Infra / `db`
- Sauvegarde/restauration de `foot` et des uploads jamais testée (au-delà du volume Docker local).
- Aucune passerelle API unique, aucun domaine de production configuré.
- Aucun migrateur SQL partagé ni table de version globale pour la base `foot` ; ordre d'application des scripts encore manuel par projet.
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

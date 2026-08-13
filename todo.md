# Backlog restant — Écosystème Foot

**Mise à jour :** 13 août 2026
**Périmètre :** uniquement les travaux non terminés, consolidés à partir de l'audit du code des 11 applications et du backlog précédent.
**Source de vérité :** code, schémas, routes, services et tests ; les tâches déjà achevées ont été retirées.

## Règles de gestion du backlog

- `[ ]` : à faire ; `[~]` : partiellement réalisé ; `[!]` : bloqué par une décision ou une dépendance externe.
- Une tâche n'est terminée que lorsque tous ses critères d'acceptation obligatoires sont validés.
- Chaque mutation sensible doit être authentifiée, autorisée, idempotente lorsque rejouable et auditée.
- Chaque flux financier doit avoir une compensation automatique ou une file de réconciliation opérateur.
- Les priorités sont : **P0** avant mise en production commerciale, **P1** pour une V1 métier complète, **P2** pour l'industrialisation.

## Vue d'ensemble

| Priorité | Nombre | Objectif |
|---|---:|---|
| P0 | 17 | Fermer les parcours argent, match officiel, accès et cohérence distribuée |
| P1 | 18 | Compléter les fonctionnalités métier indispensables |
| P2 | 9 | Industrialiser, mesurer et maintenir la plateforme |
| **Total restant** | **44** | |

---

# P0 — Bloquants avant exploitation commerciale

## Argent, commandes et compensations

### TASK-P0-001 — API de remboursement multi-fournisseur

**Projets :** `payment-api`
**Statut :** [~] Implémenté et testé ; compensation automatique (TASK-P0-002/003/006) toujours bloquée par une brique manquante

Implémenter les remboursements Konnect, Paymee et Flouci, sans simuler un succès lorsqu'un fournisseur ne les supporte pas.

**Critères d'acceptation :**
- [x] remboursement total et partiel avec montant restant remboursable calculé côté serveur (verrou `SELECT ... FOR UPDATE` sur `payments`, somme des remboursements non-`FAILED` — voir `RefundService.computeReserved`) ;
- [x] clé d'idempotence et unicité par paiement/opération (`@Unique(['paymentId', 'idempotencyKey'])` sur `Refund`, même pattern que `Payment`) ;
- [x] états `REQUESTED`, `PROCESSING`, `SUCCEEDED`, `FAILED`, `MANUAL_REVIEW` ;
- [x] motif, initiateur, timestamps, référence fournisseur et historique immuable (`RefundStatusHistory`, append-only) ;
- [x] outbox et notification du système appelant (`REFUND_SUCCEEDED`/`REFUND_FAILED`/`REFUND_MANUAL_REVIEW` via `OutboxWorkerService`, même pattern que `PAYMENT_PAID`) ;
- [x] tests de rejeu, concurrence (montant restant sous refunds concurrents), montant excessif, fournisseur indisponible et succès tardif (19 tests, `refund.service.spec.ts`) ;
- [x] endpoints de consultation et réconciliation opérateur (`GET /refunds?status=MANUAL_REVIEW`, `POST /refunds/:id/{confirm,reject,retry}`).
- [!] "webhook ... de réconciliation" : non fait pour les remboursements — aucun des trois fournisseurs n'expose de webhook de remboursement documenté (vérifié contre leur documentation publique), donc rien à écouter ; la réconciliation reste l'API opérateur ci-dessus, pas un webhook entrant.

> **Note d'audit (vérifiée contre la documentation officielle des 3 fournisseurs, pas supposée)** : `docs.konnect.network` ne documente que 3 endpoints (Initiate Payment, Get Payment Details, Webhook) — aucun remboursement. `paymee.tn` (le Paymee tunisien utilisé ici — à ne pas confondre avec le PayMee brésilien `paymee.com.br`, sans rapport) ne documente pas non plus de remboursement public ; cohérent avec `payment-reconciliation.service.ts` qui note déjà que Paymee n'expose aucun endpoint de statut serveur-à-serveur. `docs.flouci.com/api-reference/refund-payment` documente `POST /api/v2/refund_payment` (`payment_id` uniquement, pas de paramètre de montant partiel — il rembourse le total). Conséquence directe sur l'implémentation : **seul un remboursement Flouci portant sur le montant total, et unique (aucun autre remboursement déjà réservé), est automatisé** ; Konnect, Paymee, et tout remboursement partiel — y compris chez Flouci — passent par `MANUAL_REVIEW` plutôt que d'appeler un endpoint inexistant ou de rembourser plus que demandé. Voir `payment-api/README.md` § Remboursements et § Limites connues.
>
> **Reste ouvert** : TASK-P0-002 (compensation automatique paiement tardif), TASK-P0-003 (saga annulation match) et TASK-P0-006 (retours marketplace) dépendaient de « TASK-P0-001 » au sens large ; l'API de remboursement existe désormais mais ces sagas doivent encore être écrites pour l'appeler (elles ne le font pas aujourd'hui). Pas de tableau de bord/alerte sur la profondeur de la file `MANUAL_REVIEW` (TASK-P2-002).

### TASK-P0-002 — Compensation automatique des paiements tardifs sans stock

**Projets :** `billetterie`, `teamManager`, `payment-api`, `notification-api`
**Statut :** [!] Bloqué par TASK-P0-001

Remplacer le traitement manuel de `PAID_STOCK_UNAVAILABLE` par une saga durable.

**Critères d'acceptation :**
- créer automatiquement une demande de remboursement idempotente ;
- conserver billet/commande, paiement et remboursement dans un dossier de réconciliation corrélé ;
- notifier le client à chaque changement d'état ;
- alerter les opérations après dépassement du SLA ;
- tester paiement confirmé après expiration et réallocation du dernier stock.

### TASK-P0-003 — Saga d'annulation ou de report d'un match

**Projets :** `superadmin`, `matchsheet`, `billetterie`, `payment-api`, `teamManager`, `ob`, `notification-api`, `arbinote`
**Statut :** [!] Bloqué par TASK-P0-001

**Critères d'acceptation :**
- événement versionné et idempotent `MATCH_CANCELLED`/`MATCH_RESCHEDULED` ;
- fermeture ou adaptation de la billetterie et arrêt des ventes ;
- politique configurable : validité des billets après report ou remboursement ;
- annulation des convocations et mise à jour de la visibilité publique ;
- blocage de la saisie live et du vote arbitre pour un match annulé ;
- journal de saga avec étapes, retries, compensations et intervention manuelle ;
- tests E2E avec billets payés, paiements en attente et panne d'un service.

### TASK-P0-004 — Checkout marketplace multi-vendeur

**Projets :** `marketplace-api`, `ob`, `payment-api`, `notification-api`
**Statut :** [ ]

Construire le tunnel absent entre catalogue et commande.

**Critères d'acceptation :**
- panier serveur rattaché au membre, avec quantité et variante ;
- revalidation serveur du prix, du statut publié, du vendeur et du stock ;
- snapshot immuable des prix et libellés au moment de la commande ;
- création d'une `MarketOrder` et d'une `SellerOrder` par vendeur ;
- adresse, frais de livraison, taxes, devise et total calculés côté serveur ;
- paiement global idempotent ;
- confirmation des sous-commandes seulement après paiement confirmé ;
- libération du stock et annulation en cas d'échec ou d'expiration ;
- notifications membre/vendeurs et tests E2E multi-vendeur.

### TASK-P0-005 — Réservation atomique du stock marketplace

**Projets :** `marketplace-api`
**Statut :** [!] Dépend de TASK-P0-004

**Critères d'acceptation :**
- quantités `available`, `reserved`, `sold` avec invariants en base ;
- réservation transactionnelle conditionnelle empêchant tout stock négatif ;
- expiration et libération idempotente des réservations ;
- conversion `reserved → sold` exactement une fois après paiement ;
- verrouillage/concurrence testé sur la dernière unité ;
- métrique d'oversell avec cible zéro.

### TASK-P0-006 — Relier les retours marketplace aux remboursements et payouts

**Projets :** `marketplace-api`, `payment-api`, `notification-api`
**Statut :** [!] Bloqué par TASK-P0-001 et TASK-P0-004

**Critères d'acceptation :**
- `COMPLETED` déclenche un remboursement et ne signifie plus à lui seul « remboursé » ;
- passage à `REFUNDED` uniquement après confirmation financière ;
- échec de remboursement visible et rejouable ;
- commission et payout vendeur recalculés ou compensés ;
- notification du client et du vendeur ;
- tests de retour accepté, remboursement échoué, rejeu et payout déjà calculé.

## Match officiel et règles sportives

### TASK-P0-007 — Moteur de règles de compétition versionné

**Projets :** `superadmin`, `teamManager`, `matchsheet`
**Statut :** [ ]

**Critères d'acceptation :**
- règles datées par fédération, compétition, saison et catégorie ;
- quotas titulaires/remplaçants, remplacements et fenêtres ;
- contrôle âge, qualification, suspension, blessure bloquante et quotas configurables ;
- gestion prolongations et tirs au but lorsque applicables ;
- résultat de validation détaillé avec erreurs bloquantes et avertissements ;
- dérogation motivée, autorisée et auditée ;
- tests par variante de règlement.

### TASK-P0-008 — Validation des conflits de programmation

**Projets :** `superadmin`
**Statut :** [~] Chevauchements équipe/arbitre/stade, cohérence saison/date, verrou anti-course et dérogation auditée implémentés ; appartenance équipe↔compétition non vérifiable (pas de table d'inscription) et UI de dérogation non câblée

**Critères d'acceptation :**
- détecter les chevauchements d'équipe, arbitre et stade ;
- contrôler appartenance des équipes à la compétition et cohérence journée/saison/date ;
- durée minimale configurable entre deux engagements ;
- empêcher la modification des équipes après préparation/signature sans procédure de correction ;
- permettre une dérogation motivée avec permission spécifique et audit ;
- tests de création, modification et concurrence.

> **Note d'implémentation** : `superadmin/src/lib/scheduleConflicts.ts` (`findScheduleConflicts`) détecte les chevauchements équipe/arbitre/stade autour de chaque création/modification de match (`createMatchAdmin`/`updateMatchAdmin` dans `adminMatches.ts`) via une fenêtre symétrique configurable (`MATCH_MIN_REST_MINUTES`, défaut 120 min) — le modèle de données n'a pas de durée de match ni de colonne de lieu propre, donc le "stade" est approximé par `Team.stadium` (texte libre) de l'équipe qui reçoit ; `assertSeasonDateCoherence` rejette une date hors des bornes `saisons.date_debut/date_fin`. La vérification et l'écriture (insert/update) sont exécutées sous le même verrou en mémoire par ressource (`scheduleLock.ts`, clés équipe/arbitre) pour fermer la fenêtre de course entre deux requêtes concurrentes sur la même équipe/le même arbitre — limite assumée : verrou par instance de process, pas de coordination multi-instance (documentée dans le fichier). La modification des équipes d'un match est bloquée dès que sa feuille (`ms_sheets`, lue en local comme pour `reopenMatchAdmin`) n'est plus `DRAFT`, sans procédure de correction (celle-ci reste à construire, voir TASK-P0-009). Une dérogation nécessite un motif d'au moins 10 caractères (`derogation_reason`) ; les conflits outrepassés sont renvoyés par l'appel et journalisés côté route (`logAdminAction`, nouvelle action `derogation`) avec le motif et le détail des conflits. **Limites non résolues** : (1) aucune notion d'"appartenance à la compétition" n'existe dans le schéma (pas de table d'inscription équipe↔saison), donc ce critère n'est pas vérifiable sans décision de modélisation ; (2) la "permission spécifique" pour la dérogation est en pratique la même que l'accès SUPERADMIN générique — RBAC actuel n'a qu'un seul rôle admin (voir TASK-P0-014) ; (3) les routes renvoient déjà un 409 structuré (`{ error, conflicts }`) mais l'UI admin (`useAdminMatches.ts`) ne propose pas encore de ressaisir avec un motif de dérogation — le conflit remonte pour l'instant comme une erreur bloquante côté formulaire. Tests : `superadmin/src/lib/adminMatches.scheduleConflicts.test.ts` (chevauchement équipe/arbitre/stade, fenêtre de repos configurable, cohérence de saison, dérogation acceptée/rejetée, non-conflit avec soi-même en modification, blocage post-signature, et concurrence réelle — deux créations simultanées sur la même équipe : une seule persiste).

### TASK-P0-009 — Workflow de correction des événements de match

**Projets :** `matchsheet`, `superadmin`, `ob`
**Statut :** [ ]

**Critères d'acceptation :**
- corriger/annuler but, carton, blessure et remplacement sans suppression silencieuse ;
- conserver valeur avant/après, auteur, motif et date ;
- recalculer score et statistiques de façon déterministe ;
- versionner et republier la correction vers le live public ;
- invalider les signatures postérieures au contenu modifié et exiger une nouvelle signature ;
- tests E2E de correction d'un match clôturé puis rouvert.

### TASK-P0-010 — Activer l'optimistic locking jusqu'à l'interface Matchsheet

**Projets :** `matchsheet`
**Statut :** [~] Colonne/versionnement service présents, UI non branchée

**Critères d'acceptation :**
- chaque écran transporte la version courante de la feuille ;
- chaque transition envoie `expectedVersion` ;
- conflit renvoyé en 409 et présenté sans écraser la saisie locale ;
- action de rechargement/comparaison/réessai explicite ;
- test avec deux officiels : un succès, un conflit.

### TASK-P0-011 — Décider et implémenter le mode hors ligne Matchsheet

**Projets :** `matchsheet`
**Statut :** [!] Décision produit requise ; seule l'idempotence des événements est présente

**Critères d'acceptation si le mode offline est retenu :**
- stockage IndexedDB chiffrable des feuilles et événements ;
- file locale ordonnée avec `clientRequestId` ;
- resynchronisation automatique et reprise après fermeture du navigateur ;
- détection des doublons et conflits de version ;
- écran de résolution manuelle ;
- expiration et nettoyage des données locales ;
- test hors ligne avec plusieurs événements et deux terminaux.

### TASK-P0-012 — Renforcer l'identité des signataires Matchsheet

**Projets :** `matchsheet`, `sso`
**Statut :** [~] Hash, timestamp et identité de l'opérateur présents

**Critères d'acceptation :**
- authentifier individuellement chaque signataire, pas uniquement l'opérateur du terminal ;
- figer précisément le contenu signé et sa version ;
- lier rôle, identité, horodatage et hash ;
- définir le niveau de preuve attendu et choisir signature forte, OTP ou confirmation SSO ;
- invalider formellement une signature après modification ;
- conserver l'historique append-only et fournir une vérification indépendante.
> **Note d'audit** : teamManager a déjà une lib d'autorisation centralisée (`@/lib/access` : `getUserAccess`/`requirePermission`/`requireCategory`, `@/lib/team-context` : `requireTeamId`), largement appliquée sur les créations/mises à jour (ex: `PlayerService`, `MediaGalleryService.create/update/delete`) — la description du todo ("aucune borne, autorisation surtout server actions") ne reflétait plus l'état réel du code. Un audit statique (grep de toutes les méthodes `update`/`delete`/`remove` des 46 services de `src/services/`, recherche de signatures sans `teamId`) a trouvé un pattern répété : les actions de **création** vérifient systématiquement la propriété club de la ressource parente, mais plusieurs actions de **suppression/réordonnancement** de sous-ressources ne le faisaient pas — IDOR cross-club réelles et exploitables (ids numériques séquentiels devinables) :
> - `MatchGalleryService.removeGalleryFromMatch`/`removeAllGalleriesFromMatch` — aucune vérification que le match implique le club appelant (alors que `addGalleryToMatch` la faisait déjà)
> - `MediaGalleryService.removeItemFromGallery`/`updateItemOrder` — idem pour la galerie
> - `NewsService.removeMediaFromNews`/`updateNewsMediaOrder` — idem pour l'actualité
> - `TrainingInvitationService.updateResponse`/`remove` — aucune vérification que l'entraînement de l'invitation appartient au club appelant
> - `TripService.toggleConfirmed`/`removeParticipant` — aucune vérification que le déplacement du participant appartient au club appelant
>
> Corrigé en ajoutant `teamId` à chaque signature et une vérification de propriété avant mutation (même pattern que les actions de création existantes), avec tests de régression par service (`*.test.ts` à côté de chaque service). **Non fait** : la matrice complète "20+ cas de test IDOR par ressource (Players/Staff/Matches/CMS/Boutique)" demandée par le todo — l'essentiel des chemins CRUD principaux (create/update/delete des entités elles-mêmes, pas leurs sous-ressources) était déjà correctement scopé lors du sondage ; une passe exhaustive sur les 41 fichiers `actions.ts` reste à faire pour une garantie complète.
>
> **Suite (passe `actions.ts`, partielle)** : première IDOR trouvée en traçant `admin/roles/actions.ts#assignRoleToUser` → `RoleService.assignRole` : `teamId` était bien dérivé de la session côté action, mais `assignRole` faisait confiance à l'`userId` fourni par le client sans vérifier qu'il appartient à ce club — un ADMIN d'un club pouvait attribuer un rôle de son club à un `userId` deviné d'un autre club (pollution de `cms_user_roles`, fuite du nom du compte visé). Corrigé (vérification `User.findOne({ id: userId, teamId })` avant assignation, `RoleService.ts`) + test de régression (`RoleService.test.ts`). **La passe exhaustive sur les ~39 fichiers `actions.ts` reste incomplète** (seul `admin/roles/actions.ts` a été tracé jusqu'au bout jusqu'ici) — à continuer avant de considérer TASK-P0-012 clos.

## Accès, données et cohérence distribuée

### TASK-P0-013 — Audit RBAC/IDOR exhaustif de TeamManager

**Projets :** `teamManager`
**Statut :** [~] Vulnérabilités connues corrigées, audit complet restant

**Critères d'acceptation :**
- matrice ressource/action/permission/périmètre club ;
- policy centralisée utilisée par toutes les mutations et tous les exports ;
- vérification de propriété dans les services, pas seulement les actions UI ;
- tests IDOR lecture/création/modification/suppression/export pour joueurs, staff, matchs, CMS, boutique, billetterie, déplacements, entraînements et académie ;
- tests de changement de `teamId`, identifiant enfant et identifiant utilisateur ;
- aucune route sensible couverte uniquement par un contrôle d'affichage.

### TASK-P0-014 — Matrice d'autorisation transverse et rôles multiples

**Projets :** `sso`, `packages/auth-shared`, toutes les applications
**Statut :** [ ]

**Critères d'acceptation :**
- permissions/scopes versionnés au lieu d'un rôle unique implicite ;
- affiliations multiples, club actif et délégations temporaires ;
- politiques communes pour administration, scan, feuille, modération, vendeur et membre ;
- compatibilité de migration des JWT existants ;
- tests de privilège minimal et d'escalade horizontale/verticale.

### TASK-P0-015 — Vérifier fail-closed et secrets au déploiement

**Projets :** toutes les applications authentifiées
**Statut :** [~] Mécanismes applicatifs présents, conformité d'environnement non garantie

**Critères d'acceptation :**
- validation au démarrage des modes de révocation par application ;
- routes administratives, financières, scan et signature forcées en fail-closed ;
- centralisation des secrets dans Vault ou service équivalent ;
- rotation automatisée et testée des clés service ;
- logs de validation JWT incluant `kid` et source JWKS sans donnée sensible ;
- test de déploiement avec SSO indisponible et ancienne clé expirée.

### TASK-P0-016 — Contrats de schéma partagé vérifiés en CI

**Projets :** `db`, toutes les applications accédant à MySQL
**Statut :** [~] Ownership et manifeste présents, compatibilité des mappings non vérifiée

**Critères d'acceptation :**
- propriétaire défini par table et colonne ;
- extraction automatique des mappings TypeORM concurrents ;
- comparaison CI des types, longueurs, noms, nullabilité, enums, defaults et cascades ;
- interdiction d'écriture par un non-propriétaire sans décision d'architecture ;
- migration de préproduction sur une copie réaliste et test de rollback/restauration ;
- verrou MySQL de migration testé avec deux exécutions concurrentes.

### TASK-P0-017 — Idempotence transactionnelle de Notification API

**Projets :** `notification-api`
**Statut :** [x]

Éliminer la fenêtre entre recherche d'un événement, création des notifications et enregistrement de l'idempotence.

**Critères d'acceptation :**
- unicité `(application, eventId)` en base ;
- acquisition atomique de l'événement ;
- transaction couvrant événement et notifications, ou pattern inbox équivalent ;
- reprise déterministe après crash entre deux étapes ;
- deux requêtes concurrentes créent exactement un lot logique ;
- test d'échec après persistance partielle.

> **Note d'implémentation** : `IdempotencyService.withIdempotency` (`notification-api/src/events/idempotency.service.ts`) remplace le couple `findExisting`/`record` séparé par une seule transaction `DataSource.transaction()` : la création des notifications (`NotificationsService.createMany`/`createOne`, via un `EntityManager` transactionnel) et l'insertion de la ligne `notification_events` se font ou échouent ensemble. La contrainte unique `(application, eventId)` déjà présente sert de verrou d'acquisition — si l'insertion échoue en clé dupliquée (course concurrente ou rejeu), la transaction est annulée (les notifications qui viennent d'être créées ne sont jamais commitées) et le résultat déjà enregistré par le gagnant est renvoyé (`deduplicated: true`). Il n'existe donc plus d'état intermédiaire persistant entre "notifications créées" et "événement enregistré" : soit les deux sont en base, soit aucun (reprise déterministe après crash — rien à réconcilier, le rejeu suivant repart de zéro). Les jobs de canaux asynchrones (email/push/sms) ne sont mis en file BullMQ qu'après le commit de la transaction, pour ne jamais référencer une notification finalement annulée. Tests : `idempotency.service.spec.ts` couvre première réception, rejeu, isolation par `application`, la course concurrente (deux appels `withIdempotency` en parallèle sur le même `eventId` → un seul lot persisté, l'autre dédupliqué sur le même résultat) et la propagation d'une erreur non liée à un conflit de clé.

### TASK-P0-018 — Tests E2E multi-applications critiques

**Projets :** tous
**Statut :** [ ]

**Scénarios obligatoires :**
- onboarding d'un club et de son administrateur ;
- match nominal de la programmation à la publication et au vote ;
- correction d'un match signé ;
- course sur la dernière place et scans concurrents ;
- paiement dégradé, webhook perdu et paiement tardif ;
- marketplace multi-vendeur avec échec de paiement ;
- retour, remboursement et correction du payout ;
- notification multicanale avec retry/DLQ ;
- révocation SSO pendant une opération sensible ;
- annulation/report d'un match avec billets payés.

---

# P1 — Fonctionnalités métier indispensables à une V1 complète

### TASK-P1-001 — Espace membre agrégé

**Projets :** `ob`, `billetterie`, `marketplace-api`, `payment-api`, `notification-api`
**Statut :** [ ]

Afficher les billets, commandes, paiements, livraisons, retours, notifications et préférences de l'utilisateur courant, avec isolation stricte, pagination et gestion indépendante des services indisponibles.

### TASK-P1-002 — Billetterie placée et plan de stade

**Projets :** `teamManager`, `billetterie`
**Statut :** [ ]

Modéliser stade, tribune, bloc, rangée, siège, PMR/accompagnateur, quotas visiteurs, fermeture/relocalisation et verrou atomique par siège ; proposer des places adjacentes et imprimer le placement sur le billet.

### TASK-P1-003 — Cycle commercial complet de billetterie

**Projets :** `billetterie`, `payment-api`, `ob`
**Statut :** [ ]

Ajouter panier, promotions, invitations, gratuités, abonnements, transfert nominatif, revente encadrée, facture, avoir, remboursement partiel et historique de titulaire.

### TASK-P1-004 — Traitement des incohérences d'audience

**Projets :** `billetterie`, `sso`, `teamManager`
**Statut :** [~] Détection présente, décision métier incomplète

Définir suspension ou maintien du billet, contrôle manuel, preuve d'affiliation, recours, remboursement éventuel, décision autorisée et audit.

### TASK-P1-005 — Retours marketplace partiels

**Projets :** `marketplace-api`, `sellerPortal`, `payment-api`
**Statut :** [ ]

Gérer quantité et montant par ligne, plusieurs retours, retour partiel successif, frais, inspection, rejet partiel, restock et remboursement partiel.

### TASK-P1-006 — Logistique et transporteurs marketplace

**Projets :** `marketplace-api`, `sellerPortal`, `ob`, `notification-api`
**Statut :** [ ]

Ajouter zones, tarifs, transporteur, étiquette, tracking, colis multiples, expédition partielle, délais, preuve de livraison et gestion des incidents.

### TASK-P1-007 — Ledger financier, commissions et payouts

**Projets :** `payment-api`, `marketplace-api`, `sellerPortal`
**Statut :** [ ]

Créer des écritures immuables pour brut, frais, commission, taxes, remboursement, chargeback, retenue et net vendeur ; rapprocher paiements et versements et produire un justificatif.

### TASK-P1-008 — Onboarding et conformité vendeur

**Projets :** `marketplace-api`, `sellerPortal`, `superadmin`
**Statut :** [ ]

Collecter identité légale, fiscalité, représentant, adresse, documents et compte bancaire ; ajouter validation, expiration, renouvellement, suspension et audit.

### TASK-P1-009 — Unifier boutique historique et marketplace

**Projets :** `teamManager`, `marketplace-api`, `sellerPortal`, `ob`
**Statut :** [!] Décision d'architecture requise

Décider migration, séparation explicite ou synchronisation ; éliminer les doubles sources de vérité pour produits, stocks, commandes et statuts.

### TASK-P1-010 — Éligibilité et confiance des votes ArbiNote

**Projets :** `arbinote`, `billetterie`, `sso`
**Statut :** [ ]

Différencier vote vérifié par billet utilisé/affiliation, vote membre et vote anonyme ; définir fenêtre de vote, pondération, seuil de publication et affichage du niveau de confiance.

### TASK-P1-011 — Critères d'évaluation arbitre versionnés

**Projets :** `arbinote`, `superadmin`
**Statut :** [ ]

Versionner critères et pondérations par rôle d'officiel, compétition, type de match, période et langue ; préserver la règle utilisée pour chaque vote historique.

### TASK-P1-012 — Contestation et droit de réponse ArbiNote

**Projets :** `arbinote`, `notification-api`
**Statut :** [ ]

Permettre observation, contestation, instruction, décision, recours, délais, pièces et historique de modération sans exposer les votants.

### TASK-P1-013 — Cycle de vie complet du compte SSO

**Projets :** `sso`
**Statut :** [ ]

Ajouter vérification email, versions de CGU/consentements, export, suppression/anonymisation, fusion Google/local, gestion des appareils/sessions et récupération MFA par codes de secours.

### TASK-P1-014 — Préférences de notification avancées

**Projets :** `notification-api`, `ob`
**Statut :** [ ]

Ajouter quiet hours, fuseau, fréquence, digests, priorité urgente, fallback, consentement marketing et préférences par application/club.

### TASK-P1-015 — Délivrabilité et console d'exploitation notifications

**Projets :** `notification-api`
**Statut :** [~] Deliveries/retries présents, exploitation incomplète

Gérer bounces, plaintes, tokens invalides, destinations mortes, DLQ, rejeu manuel, coûts et taux de livraison par fournisseur.

### TASK-P1-016 — Live public résilient

**Projets :** `ob`, `matchsheet`
**Statut :** [ ]

Ajouter curseur/replay SSE, reconnexion, ordre strict, correction, fallback polling, score provisoire/officiel, limitation de connexions et tests de charge.

### TASK-P1-017 — Contrats HTTP consommables

**Projets :** `marketplace-api`, `payment-api`, `notification-api`, consommateurs
**Statut :** [~] Spécifications présentes, versionnement et contrats consommateurs absents

Introduire `/v1` sans rupture, générer les SDK TypeScript, valider les réponses, ajouter contract tests et politique de dépréciation.

### TASK-P1-018 — Événements métier versionnés et sagas observables

**Projets :** tous les producteurs/consommateurs
**Statut :** [!] Infrastructure de bus à choisir

Choisir Redis Streams, RabbitMQ ou équivalent ; définir enveloppe, versions, inbox/outbox, ordre, rejeu, rétention, DLQ et corrélation pour match, paiement, billet, commande, retour et notification.

---

# P2 — Industrialisation et maintenabilité

### TASK-P2-001 — Observabilité OpenTelemetry

**Statut :** [ ]
Propager correlation/trace ID, traces distribuées, logs JSON, métriques RED/USE et tableaux de bord par parcours métier.

### TASK-P2-002 — Alertes, SLO et runbooks

**Statut :** [ ]
Définir SLO SSO/paiement/scan/live/notification, alertes DLQ et paiements bloqués, astreinte et procédures de résolution testées.

### TASK-P2-003 — Sauvegarde, restauration et reprise après sinistre

**Statut :** [ ]
Définir RPO/RTO, sauvegardes chiffrées, restauration régulièrement testée et procédure blue/green/rollback.

### TASK-P2-004 — Tests de charge et chaos

**Statut :** [ ]
Tester scan d'entrée, live SSE, vente de dernière place, checkout, files de notifications et pannes Redis/SSO/MySQL/fournisseurs.

### TASK-P2-005 — Couverture de tests des domaines critiques

**Statut :** [ ]
Atteindre au moins 80 % sur règles critiques et ajouter des tests aux domaines TeamManager peu couverts : joueurs, staff, convocations, blessures, sanctions, suspensions, tactiques, académie, sponsors, recrutement et billetterie admin.

### TASK-P2-006 — Harmonisation de la chaîne frontend

**Statut :** [ ]
Aligner Next.js, React, TypeScript, ESLint et scripts de test ; supprimer les divergences de gestionnaires de paquets et garantir une installation reproductible.

### TASK-P2-007 — Packages partagés et génération de modèles

**Statut :** [ ]
Mutualiser contrats, enums et types stables sans partager les entités de persistance propriétaires ; générer les clients depuis les contrats.

### TASK-P2-008 — Sécurité et conformité des médias

**Statut :** [ ]
Centraliser uploads, antivirus, type réel, taille/quota, nettoyage, URLs signées, rétention et suppression RGPD.

### TASK-P2-009 — Qualité produit

**Statut :** [ ]
Ajouter tests accessibilité, visuels et performance, CAPTCHA/antispam, feature flags, prévisualisation/versionnement des templates et exports asynchrones avec progression.

---

# Ordre d'exécution recommandé

## Lot 1 — Fermer les flux financiers

`P0-001 → P0-002/P0-003/P0-006`, en parallèle de `P0-004 → P0-005`.

## Lot 2 — Garantir le match officiel

`P0-007`, `P0-008`, `P0-009`, `P0-010`, décision `P0-011`, puis `P0-012`.

## Lot 3 — Sécuriser les frontières

`P0-013` à `P0-017`, avec vérification sur une base MySQL de préproduction.

## Lot 4 — Recette transverse

Exécuter `P0-018` avant toute ouverture commerciale, puis traiter les P1 par chaîne de valeur : billetterie, marketplace, membre, arbitrage et notifications.

## Définition globale de « terminé »

Une tâche est terminée seulement si :

1. les règles métier et transitions sont explicites ;
2. les contrôles d'accès et d'isolation sont testés ;
3. les écritures concurrentes et rejeux sont sûrs ;
4. les erreurs ont une compensation ou une procédure opérateur ;
5. les migrations sont livrées et vérifiées sur MySQL ;
6. les tests unitaires, intégration et E2E concernés sont verts ;
7. logs, métriques et alertes permettent d'exploiter le flux ;
8. aucun critère obligatoire ci-dessus ne reste ouvert.

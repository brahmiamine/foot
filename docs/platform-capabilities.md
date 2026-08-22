# FOOT — Platform Capabilities

> Document canonique de statut fonctionnel du monorepo.
>
> Pour savoir si une capacité existe **aujourd'hui**, utiliser ce fichier avec le code de `main` et le README du domaine concerné. Les fichiers de migration historiques décrivent aussi l'histoire d'implémentation et peuvent contenir des bilans intermédiaires devenus obsolètes après des PR ultérieures.

## Légende

- `IMPLEMENTED` : parcours réellement présent dans le code.
- `PARTIAL` : fondation/parcours présent mais limitation explicite restante.
- `PLANNED` : suivi dans `platform-governance-roadmap.md`, pas encore livré.
- `DEPRECATED` : ancien parcours conservé uniquement pour compatibilité ou explicitement désactivé.

## Snapshot

- Référence de départ de la roadmap gouvernance : `main` après merge de PR #93 (`7e3dd3194dbbd52f15f5ab84d81b692a979b7de5`).
- Backlog et preuves de validation des améliorations de gouvernance : [`../platform-governance-roadmap.md`](../platform-governance-roadmap.md).
- Ce document est ré-aligné à chaque lot clôturé ; une capacité n'est qualifiée `IMPLEMENTED` qu'avec code serveur réel et gates de validation correspondants.

## Applications et services

| Domaine | Statut | Capacités actuelles | Limites / prochain axe |
|---|---|---|---|
| `identity` | IMPLEMENTED | SSO RS256/JWKS, reset password, affiliations, rôles/scopes, révocation globale, provisionnement PLAYER par invitation, policy MFA par rôle et step-up MFA pour actions sensibles, policy d'inscription MEMBER par club `OPEN / EMAIL_VERIFICATION / CLUB_APPROVAL / INVITE_ONLY / CLOSED` appliquée côté serveur aux parcours mot de passe et Google OAuth, vérification email, file d'approbation club et invitations à usage unique, registre de sessions avec `sid`, inventaire appareils/IP/activité, révocation d'une session scopée au compte et logout all propagés via introspection, accès temporaire `[validFrom, validUntil)` relu côté serveur à la connexion et à chaque introspection avec administration/audit Club Hub | les JWT pré-ID-005 sans `sid` expirent naturellement sous 12 h ; la propagation inter-app d'une révocation ou expiration administrative est bornée par le cache d'introspection existant de 30 s |
| `federation-hub` | IMPLEMENTED | référentiels, arbitrage privé, licensing, registrations, contrats, transferts, sanctions, litiges, appels, cycles saisonniers, finance, gouvernance, stades, qualifications, médical fédéral, agents, console plateforme des remboursements manuels Payments et accès opérateur au ledger Payments, Regulatory Policy Center (résolution hiérarchique PLATFORM→FEDERATION→LEAGUE→SEASON, délégation fédération→ligue par opération, commission réellement obligatoire selon policy sur discipline/appels/licences club), centre transversal de dérogations bornées avec motif/référence/audit et premier enforcement réel sur les justificatifs obligatoires de subvention, assurances avec expiration effective et exigence par compétition, subventions avec justificatifs documentaires obligatoires, droits média et indemnités formation/solidarité réglables paid/disputed, SLA réglementaires sur 7 domaines avec contrat partagé `workflow-sla`, timestamps reminder/due/escalation, seuil d'escalade versionné, cron protégé, destinataires scopés et ledger idempotent/retriable, mode de migration permissions LEGACY/WARN/ENFORCE, dashboard « Mes actions » agrégé par permission effective et scope fédération/ligue avec agrégation des fédérations actives pour PLATFORM_SUPERADMIN, grilles d'évaluation officielle des arbitres versionnées (`official_referee_criteria` append-only id+version, scope saison/compétition optionnel, non-rétroactivité via `criteria_effective_at` figé par évaluation), administration de la policy de désignation des officiels et classement des candidats (proxy vers match-operations) | revue club en libre-service des droits média contestés PLANNED |
| `club-hub` | IMPLEMENTED | administration club, effectif, staff, sport, contenu, academy, recrutement, sponsors, ticketing admin, marketplace admin, dossier fédéral, maker/checker, workflows News/Communiqués et approbation produits, paramètres publics centralisés des formulaires (académie/recrutement/sponsor/vendeur/contact) avec ouverture/fenêtre/rate limit appliqués côté serveur, gestion des types et demandes de membership, dashboard « Mes actions » limité aux décisions réellement autorisées (permissions + maker/checker + décisions déjà prises), feature settings club versionnés/audités pour Académie/Recrutement/Sponsoring/Billetterie/Marketplace avec garde serveur avant DB/HTTP et administration avec motif obligatoire | candidatures académie/recrutement enrichies, sponsoring/déplacements et autres policies P1 PLANNED |
| `player-hub` | IMPLEMENTED | portail PLAYER, calendrier, réponses, statistiques, discipline, déplacements, notifications, compte PLAYER provisionnable par invitation depuis Club Hub, demandes de modification de profil (champs simples directs, identité sportive soumise à approbation Club Hub), disponibilité structurée déclarée par le joueur (AVAILABLE/UNAVAILABLE/LIMITED, période + motif, consommée en lecture par Staff Hub à la composition), portefeuille documentaire en lecture (licence/contrat/inscription/aptitude médicale FIT-UNFIT sans détail clinique/suspension), consentements/signatures avec historique (contrat/transfert/licence/image/règlement), demandes administratives avec suivi (attestation/document/rendez-vous) | granularité fine par compétition sur la disponibilité déclarée PLANNED |
| `staff-hub` | IMPLEMENTED | portail staff opérationnel sur les données/RBAC Club Hub, composition DRAFT→PROPOSED→APPROVED→LOCKED avec proposition adjoint et approbation coach, verrouillage automatique de la composition configurable par club avant coup d'envoi (`enabled`/`lockMinutesBeforeKickoff`), validation optionnelle des plans d'entraînement DRAFT→SUBMITTED→APPROVED avec maker/checker, revue/verrouillage des statistiques post-match avec fenêtre configurable et corrections auditées après verrouillage, délégation temporaire de coach principal bornée à un seul match ou à une période et réservée à un membre du staff qualifié (COACH/ADJOINT), blocage serveur de l'ajout à la feuille d'un joueur déclaré indisponible (lecture de la disponibilité self-service Player Hub) | portefeuille de politiques encore limité au scope club (pas de granularité par compétition) |
| `medical-hub` | IMPLEMENTED | blessures, indisponibilités, documents, permissions médicales strictes, journal append-only, Return-to-Play structuré, clearance configurable et tests de non-divulgation | stockage objet/chiffrement/antivirus et politique de rétention PLANNED |
| `referee-hub` | IMPLEMENTED | désignations, historique, indisponibilités, rapports privés, accès feuille, acceptation/refus de désignation et demandes de remplacement revues par la Fédération, policy d'indisponibilité versionnée (préavis/durée max/récurrence/justificatif par motif), policy des rapports d'officiels (rôles obligatoires, délai, rappel/escalade `FEDERATION_ADMIN` via GOV-008, amendement explicite audité au lieu de correction silencieuse), déclaration de conflit d'intérêts obligatoire avant acceptation d'une désignation | policies encore PLATFORM uniquement (pas de granularité fédération/ligue) |
| `arbinote` | IMPLEMENTED | perception publique des arbitres, votes protégés, statistiques, modération séparée, voting policy hiérarchique PLATFORM→FEDERATION→LEAGUE→SEASON (mode d'éligibilité, fenêtre de vote, seuil de visibilité, seuil de quarantaine) résolue sur la portée réelle du match et appliquée côté serveur, mise en quarantaine automatique idempotente des votes suspects avant revue humaine, score masqué tant que le seuil minimal de votes n'est pas atteint, critères publics versionnés append-only (non-rétroactivité) | granularité fine par compétition sur la quarantaine et historique de policy PLANNED |
| `match-operations` | IMPLEMENTED | feuille électronique, contrôles, live, signatures, éligibilité serveur, staff officiel, protocole match configurable, amendement explicite post-signature et policy de correction versionnée, policy de désignation des officiels MANUAL/SUGGESTED/AUTO (disponibilité toujours bloquante, grade/repos/historique/distance filtrant uniquement en SUGGESTED/AUTO via classement en lecture seule) | offline PWA complet reste PARTIAL/PLANNED ; critère distance non appliqué tant qu'aucune donnée géocodée n'est fournie par l'appelant |
| `ticketing` | IMPLEMENTED | vente, paiement, QR, scan online/offline, révocation, remboursements/reconciliation, audience STRICT/DECLARATIVE, workflow DRAFT→REVIEW→APPROVED→SCHEDULED→OPEN et revalidation tarifaire, billets gratuits/invitations avec quota et approbation maker/checker, registre d'appareils scanner (révocation, rotation de clé, dernière synchro) exigé sur le flux hors-ligne, fenêtre d'ouverture/fermeture des gates et validité configurable du manifeste hors-ligne, transfert de billet par acceptation (deadline, plafond de transferts), abonnements saison (entitlement multi-match, renouvellement en append-only) et promotions à code auditées | package multi-catégories et paiement natif de l'abonnement saison PLANNED |
| `marketplace` | IMPLEMENTED | catalogue multi-vendeur, modération, stock, checkout, commandes, retours, payouts, seller applications/settings, allocation `SELLER_NET/CLUB_NET` avant exposition du payUrl et settlement Payments avant passage payout à PAID | allocations/settlements historiques pré-PAY-004 non reconstruits ; moteur frais livraison/taxes PLANNED |
| `seller-portal` | IMPLEMENTED | portail privé vendeur, activation par invitation, produits, stock, commandes, retours, payouts | accès DB local historique encore en transition vers Marketplace comme source unique |
| `payments` | IMPLEMENTED | Konnect/Paymee/Flouci, idempotence, routing policy par consommateur, refunds, seuils AUTO/SINGLE/DUAL avec maker/checker, `MANUAL_REVIEW`, SLA/reminders/escalations idempotents et retriables, dashboard plateforme, ledger append-only `GROSS/PROVIDER_FEE/PLATFORM_FEE/CLUB_NET/SELLER_NET/REFUND/SETTLEMENT`, et réconciliation provider/interne avec file d'écarts, recheck et résolution auditée via Federation Hub | `PLATFORM_FEE` modélisé sans producteur courant ; historique métier non reconstructible non inventé ; le moteur MANUAL_REVIEW reste l'implémentation NestJS historique mais respecte les garanties du contrat transversal GOV-008 sans import runtime ESM |
| `notifications` | IMPLEMENTED | in-app/email/push, préférences, NotificationPolicy PLATFORM/CLUB, quiet hours/timezone, digests HOURLY/DAILY idempotents, escalade des notifications HIGH/URGENT non lues, templates versionnés DRAFT→SUBMITTED→APPROVED→ACTIVE→ARCHIVED avec maker/checker et audit ; service de livraison utilisé par les moteurs SLA GOV-008 | SMS non implémenté |
| `club-ob` | IMPLEMENTED | site public OB, espace membre, contenus, boutique, seller application public entry point, Public Forms policy centralisée depuis Club Hub, membership FAN/SOCIO/VIP/SUPPORTER/PARTNER, prévente Ticketing liée au membership et PublicContentPolicy avec sections programmables/bannière d'urgence | le lot de gouvernance `OB-001..004` est clôturé ; évolutions communautaires et produit restent hors de ce lot |

## Seller onboarding canonique

Depuis la PR #93, le flux vendeur est :

```text
club-ob (demande publique)
        ↓
marketplace / seller application
        ↓
club-hub (revue selon settings)
        ↓
Seller + SellerUser INVITED
        ↓
email avec jeton à usage unique / expiration
        ↓
seller-portal /activate
        ↓
SellerUser ACTIVE
```

Règles actuelles :

- l'inscription vendeur directe depuis `seller-portal` est désactivée ;
- `POST marketplace/auth/register` est conservé comme endpoint de compatibilité mais renvoie `410 Gone` ;
- aucun mot de passe candidat n'est créé au dépôt de demande ;
- le mot de passe est choisi lors de l'activation ;
- les settings club gouvernent approbation vendeur et produit ;
- une modification sensible d'un produit publié peut imposer une nouvelle validation.

## Source de vérité réglementaire

`migration-v2.md` reste la spécification et l'historique de migration, mais ses bilans intermédiaires ne doivent pas être utilisés seuls pour conclure qu'une capacité est absente. Toujours vérifier :

1. le code de `main` ;
2. le README actuel de `federation-hub`, `club-hub`, `match-operations`, `payments` ou du domaine concerné ;
3. les migrations versionnées du propriétaire de données et, pour le schéma partagé, celles enregistrées dans `db/migrations.manifest` ;
4. ce document de statut.

La migration Federal Operations V3 prépare notamment commissions, assurances, subventions, droits TV, indemnités de formation, solidarité et contrôle documentaire. Une table/migration seule ne suffit pas à qualifier une capacité de `IMPLEMENTED` : il faut aussi workflow serveur, autorisation, UI/intégration si le domaine l'exige, et tests.

## Règles pour les agents de développement

- Ne jamais recréer un domaine uniquement parce qu'un ancien bilan Markdown le marque incomplet.
- Chercher d'abord son propriétaire actuel et les callers réels.
- Une feature flag ou un setting UI ne remplace jamais une garde serveur.
- Les identifiants de tenant (`teamId`, `federationId`, `leagueId`) sont dérivés du contexte authentifié côté serveur.
- Les décisions sensibles doivent être motivées et auditables.
- Après chaque implémentation, mettre à jour ce fichier si le statut d'une capacité change, puis mettre à jour `platform-governance-roadmap.md` avec la preuve de validation.
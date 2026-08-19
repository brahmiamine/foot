# Platform Governance Roadmap

> Source de vérité du chantier de gouvernance, paramétrage, approbations et durcissement de la plateforme `foot`.
>
> Règle de suivi : une tâche ne passe à `DONE` qu'après implémentation réelle et validation ciblée/CI. Le fichier est mis à jour à chaque lot traité.

## Statuts

- `TODO` : non commencé
- `IN_PROGRESS` : travail en cours sur la branche
- `DONE` : implémenté et validé
- `BLOCKED` : dépendance ou décision externe nécessaire
- `DEFERRED` : volontairement reporté après un lot prioritaire

## Priorités

- `P0` : sécurité, gouvernance, intégrité métier ou fort effet transversal
- `P1` : forte valeur métier, dépend souvent des fondations P0
- `P2` : amélioration avancée / industrialisation

## Journal

- 2026-08-17 — branche `feat/platform-governance-roadmap` créée depuis `main` (`7e3dd3194dbbd52f15f5ab84d81b692a979b7de5`).
- 2026-08-17 — backlog initial créé après audit des applications et services du monorepo.
- 2026-08-17 — CI #796 + Ownership boundaries #325 : Identity, Staff Hub, Medical Hub, Player Hub, Referee Hub, Federation Hub, Match Operations, Ticketing, Marketplace, Payments, Notifications, ArbiNote, Club OB, migrations, architecture, design system et i18n validés verts. Club Hub a typecheck + lint verts ; son build/test final reste le dernier gate du lot Club.
- 2026-08-17 — clôturés après validation : `GOV-001`, `GOV-002`, `GOV-003`, `ID-001`, `ID-002`, `ID-003`, `STAFF-001`, `MED-001` à `MED-004`, `REF-001`, `REF-002`, `OPS-002`. `GOV-004/GOV-005` restent partiels par exigence de persistance/audit standard à généraliser. `CLUB-002` reste partiel car le statut `SCHEDULED` n'est pas encore implémenté.
- 2026-08-17 — CI #817 : lot Club Hub validé avec typecheck, lint, build et 191 tests verts, plus migrations/architecture/i18n et le reste de la matrice verts. Clôture de `CLUB-001` à `CLUB-004` : maker/checker, News avec `SCHEDULED` serveur et revalidation contenu/médias, Communiqués avec niveau d'approbation par catégorie, boutique club avec approbation/reapproval.
- 2026-08-17 — CI #836 + Ownership : `MATCH-001` validé avec `CompetitionMatchProtocol` par saison, enforcement serveur des deadlines/banc/substitutions/signatures/officiels, API interne et respect de `ClubLineupReadPort` ; typecheck/lint/build/tests Match Operations, architecture et manifest verts.
- 2026-08-17 — CI #852 + Ownership #381 : `MATCH-002` validé. Les feuilles post-match signées/clôturées exigent un amendement explicite avant correction, chaque correction reste dans le ledger append-only, les créations live/hard-delete non audités restent bloqués, et l'amendement se ferme en `RE_SIGNED` uniquement après re-signatures valides du nouveau hash.
- 2026-08-17 — CI #895 + Ownership #424 : `MATCH-003`, `TICK-001`, `TICK-002` et `PAY-001` validés. Match Operations conserve la version de policy de correction post-signature et exige l'approbation fédérale configurée ; Ticketing applique le workflow DRAFT/REVIEW/APPROVED/SCHEDULED/OPEN avec revalidation tarifaire ; Payments applique une policy provider enabled/default/fallback par consommateur, une administration séparée et des replays idempotents sans fallback PSP ambigu.
- 2026-08-17 — CI #930 + Ownership #459 : `PAY-002` validé. Payments résout `AUTO / SINGLE_APPROVAL / DUAL_APPROVAL` par seuil et consommateur avant tout appel PSP, conserve un snapshot de policy par remboursement, réserve le montant en `AWAITING_APPROVAL`, impose maker/checker et deux approbateurs distincts en DUAL, protège retry/confirm contre les contournements, grandfather les remboursements legacy lors de la migration et garde Ticketing/Club Hub/Marketplace compatibles via normalisation locale de l'état d'attente.
- 2026-08-18 — build (`nest build`) + suite `jest` (99 tests) vertes : lot `NOTIF-001` à `NOTIF-005` validé. `NotificationPolicy` (PLATFORM/CLUB, résolution par `resolvePolicy`) fixe mandatory/default/disabled par canal et catégorie et surclasse `PreferencesService` sans jamais abaisser les types historiquement mandatory ; heures calmes/timezone par utilisateur différent l'envoi jusqu'à leur fin sauf priorité `URGENT` (bypass total) ; digests `HOURLY`/`DAILY` agrègent via une revendication atomique (`UPDATE ... WHERE flushed=false`) garantissant l'idempotence même si le cron se chevauche ; l'escalade des notifications `HIGH`/`URGENT` non lues insère d'abord la trace unique par `notificationId` avant d'envoyer au destinataire de secours (explicite ou résolu par rôle), avec la même garantie d'idempotence ; les templates suivent désormais `DRAFT→SUBMITTED→APPROVED→ACTIVE→ARCHIVED` avec maker/checker sur l'approbation, une seule version `ACTIVE` par (type, canal, langue) et un audit GOV-005 complet (`notification_policy_audit`, avant/après/acteur/motif/IP/UA) partagé par NOTIF-001 et NOTIF-005. `packages/domain-contracts` (GOV-001/GOV-005) n'a pas pu être importé tel quel : c'est un paquet ESM pur, et `notifications` est un service NestJS CommonJS exécuté sans bundler (`node dist/main.js`) — un `tsc "nodenext"` compile ce fichier externe en ESM d'après son propre `package.json`, ce que `require()` ne peut pas charger en production. Les fonctions pures nécessaires (`resolvePolicy`, `requireConfigurationChangeReason`) ont donc été recopiées à l'identique dans `notifications/src/common/domain-contracts/`, avec un commentaire explicite pour qu'un futur lot ne réintroduise pas l'import relatif cassé.
- 2026-08-18 — typecheck + lint + `vitest` (211 club-hub, 32 club-ob, 119 ticketing) verts : lot `OB-001` à `OB-004` validé. `PublicFormSettings` (club-hub, par club+domaine) fixe ouverture/fenêtre/rate limit pour académie/recrutement/sponsor/vendeur/contact, appliqué côté serveur dans chaque action de soumission (club-hub) et via `/api/internal/public-form-settings` pour le formulaire vendeur (club-ob) — le frontend public ne décide jamais lui-même. `MembershipType`/`Membership` (club-hub) portent droits/durée/approbation configurables par club et le cycle SUBMITTED/ACTIVE/REJECTED/EXPIRED/CANCELLED, exposés à l'espace membre (club-ob) et à `ticketing` via `/api/internal/memberships/*`. `TicketSaleRule` gagne `presaleRequiresMembership`/`presaleMembershipCodes`/`presaleEndsAt` (inclus dans le fingerprint de gouvernance des ventes) et `purchaseTickets` vérifie l'éligibilité membership côté serveur avec échec fermé (`fetchActiveMembership` → `null` sur toute panne rejette l'achat), même schéma que `audienceValidationMode=STRICT`. `PublicContentPolicy` (club-hub, `resolvePolicy` PLATFORM→CLUB) fixe les sections publiques activables et la bannière d'urgence ; chaque page publique de club-ob (actualités, communiqués, galerie, boutique, calendrier, communauté, partenaires, recrutement, formation, devenir-vendeur) renvoie 404 si sa section est désactivée, et `PageChrome` affiche la bannière résolue. La "programmation de publication" réutilise nativement `effectiveFrom`/`effectiveUntil` de `resolvePolicy` plutôt qu'un mécanisme dédié. Piège relevé en cours de lot et corrigé avant merge : `resolvePolicy` hérite clé par clé au premier niveau seulement — un objet imbriqué (`{ channels: {...} }`/`{ sections: {...} }`) se fait remplacer intégralement par la portée la plus spécifique au lieu de fusionner ; NOTIF-001 et OB-004 utilisent donc chacun un type de valeurs à plat (un canal/une section = une clé de premier niveau), couvert par des tests dédiés.
- 2026-08-18 — CI #939 + Ownership #468 : `PAY-003` validé. Payments applique un SLA `MANUAL_REVIEW` versionné par consommateur avec snapshot par cycle, reminder et escalation idempotents sous verrou, retry si Notifications n'accepte pas l'alerte, dashboard opérateur plateforme et édition de policy via Federation Hub ; migration TypeORM et runner de migrations autonome alignés, lint/build/tests Payments et Federation Hub ainsi que la matrice CI globale sont verts.
- 2026-08-18 — typecheck (`tsc --noEmit`), `vitest run` (56 fichiers / 292 tests), `eslint` (0 erreur), `test:i18n` (parité FR/AR), `db/validate-manifest.sh` et `scripts/validate-architecture-boundaries.mjs` verts sur `federation-hub` : `FED-001` à `FED-005` validés. Regulatory Policy Center (`federal_regulatory_policies`, résolution hiérarchique PLATFORM→FEDERATION→LEAGUE→SEASON via `@foot/domain-contracts/policy`, provenance de chaque valeur, écran `/admin/regulatory-policy-center`) ; templates documentaires étendus `CONTRACT`/`MEDICAL` avec `signature_required`/`verification_method` configurables et capture de signature sur les soumissions ; délégation fédération→ligue par opération (`delegatedOperations`, garde serveur `assertOperationDelegated` sur assurance/subventions/droits média/formation/solidarité/conformité documentaire/licence club/discipline/appel) ; décision de commission signée et conforme au quorum désormais réellement obligatoire (quand la policy l'active) avant toute décision disciplinaire, sur appel ou de licence club — comportement historique préservé par défaut (aucune policy = aucune commission exigée).
- 2026-08-18 — typecheck, `vitest run` (59 fichiers / 317 tests), `eslint` (0 erreur), `test:i18n`, `db/validate-manifest.sh` et `scripts/validate-architecture-boundaries.mjs` verts sur `federation-hub` : `FED-006` à `FED-011` validés. Assurances : `saisons.requires_insurance` bloque l'approbation d'engagement sans police active non expirée, et les polices ACTIVE/SUSPENDED expirées s'affichent EXPIRED sans tâche planifiée. Subventions : approbation bloquée tant que les exigences documentaires obligatoires du domaine GRANT n'ont pas de soumission `VALID` liée (`GRANT_APPLICATION`). Droits média : les allocations peuvent désormais atteindre `PAID`/`DISPUTED` (c'était le seul statut jamais écrit) avec motif de contestation obligatoire. Formation/solidarité : bénéficiaires/allocations réglables en `PAID`/`DISPUTED`, le dossier parent agrège leur statut (`computeAggregateCaseStatus`) sans jamais repasser à `PAID` tant qu'un seul reste en litige. SLA réglementaires : seuils alerte/dépassement par domaine (`regulatory_sla_policies`, défauts préservant le comportement historique tant que rien n'est configuré) et file overdue calculée à la volée sur 7 domaines. Permissions : mode global `LEGACY/WARN/ENFORCE` (`regulatory_permission_mode_settings`) — WARN évalue comme ENFORCE mais n'empêche rien, journalise seulement (`regulatory_permission_warnings`), pour mesurer l'impact avant bascule réelle.
- 2026-08-18 — CI #955 + Ownership #484 : `PAY-004` validé. Payments possède un ledger financier append-only idempotent couvrant `GROSS / PROVIDER_FEE / PLATFORM_FEE / CLUB_NET / SELLER_NET / REFUND / SETTLEMENT`, projette paiements/remboursements depuis l'outbox avant livraison externe, accepte de façon race-safe l'allocation Marketplace au millime et protège les lectures/settlements par application ; Marketplace enregistre `SELLER_NET/CLUB_NET` avant exposition du payUrl et le `SETTLEMENT` avant passage d'un payout à `PAID`. Lint/build/tests Payments, Marketplace et matrice CI globale sont verts.
- 2026-08-18 — Ownership boundaries #506 vert après un cycle RED→GREEN dédié : `OPS-003` est clôturé avec `.github/CODEOWNERS` couvrant explicitement GitHub/CI, DB, contrats de domaine et applications sensibles, plus `scripts/validate-codeowners.mjs` qui empêche la dérive. Réconciliation documentaire : `CLUB-005` est déjà fourni par `PublicFormSettings`/OB-001 avec enforcement serveur, et `PAY-005` par la file de réconciliation provider/interne fusionnée en PR #103 ; les deux statuts sont donc réalignés sur le code de `main`.
- 2026-08-19 — CI #1028 + Ownership #557 : `GOV-006` validé. `packages/domain-contracts` expose un contrat commun de configuration effective (`valeur + source + scope + version + effectiveFrom/effectiveUntil + versions appliquées`) consommé sans résolution côté UI. Federation Hub résout les policies réglementaires PLATFORM→FEDERATION→LEAGUE→SEASON à une date donnée ; Club Hub agrège PublicContentPolicy, les cinq PublicFormSettings et les NotificationPolicy effectives. Notifications expose une résolution expliquée DEFAULT/PLATFORM/CLUB ainsi qu'un endpoint admin borné au `teamId` de l'ADMIN (SUPERADMIN seul peut cibler un autre club). Typecheck/lint/build/tests Club Hub, Federation Hub et Notifications ainsi que la matrice CI globale sont verts.
- 2026-08-19 — TDD RED CI #1031 puis CI #1048 + Ownership #577 verts : `GOV-007` validé. Le contrat partagé `governance-exception` impose une fenêtre `[validFrom, validUntil)`, une révocation explicite et un matching exact `ruleKey + targetType + targetId + reference`. Federation Hub persiste les dérogations sans hard-delete, réserve création/révocation à PLATFORM/FEDERATION, refuse l'auto-dérogation LEAGUE_ADMIN, audite création/révocation avec acteur/motif/IP/User-Agent et expose un centre d'administration. Premier consommateur réel : l'approbation d'une subvention reste bloquée pour justificatif obligatoire manquant sauf dérogation active visant exactement la demande et l'exigence documentaire concernée. Migration manifestée, typecheck/lint/build/tests et matrice globale verts.

---

# A. Fondations transverses

| ID | Priorité | Statut | Tâche | Critère de fin |
|---|---|---|---|---|
| GOV-001 | P0 | DONE | Architecture commune de policies/settings avec héritage PLATFORM → FEDERATION → LEAGUE → SEASON/COMPETITION → CLUB | package partagé typé + tests de résolution/héritage + documentation d'usage |
| GOV-002 | P0 | DONE | Modèle commun d'approbation `AUTO / SINGLE_APPROVAL / DUAL_APPROVAL / COMMISSION` | types partagés + règles maker/checker + tests |
| GOV-003 | P0 | DONE | Interdire l'auto-approbation quand `makerCheckerEnabled=true` | garde serveur réutilisable + tests |
| GOV-004 | P0 | IN_PROGRESS | Versionner les policies importantes (`version`, `effectiveFrom`, `effectiveUntil`) | résolution temporelle + conservation de la version utilisée |
| GOV-005 | P0 | IN_PROGRESS | Audit standard des changements de configuration | before/after/actor/reason/IP/User-Agent + tests |
| GOV-006 | P1 | DONE | Panneau "Configuration effective" avec origine de chaque valeur héritée | UI + API de résolution expliquant la provenance |
| GOV-007 | P1 | DONE | Centre transversal des exceptions/dérogations | modèle borné dans le temps + motif + référence + audit |
| GOV-008 | P1 | TODO | SLA/reminders/escalations communs aux workflows | timestamps + rappels + escalades idempotentes |
| GOV-009 | P1 | TODO | Dashboard "Mes actions à traiter" club/fédération | agrégation des files d'approbation par utilisateur/scope |
| GOV-010 | P1 | TODO | Feature settings par club | activation serveur des modules sans simple masquage UI |

# B. Identity / sécurité des comptes

| ID | Priorité | Statut | Tâche | Critère de fin |
|---|---|---|---|---|
| ID-001 | P0 | DONE | Provisionnement Player Hub depuis `club-hub` par invitation | sélection Player → invitation → activation → compte PLAYER lié |
| ID-002 | P0 | DONE | Politique MFA par rôle | REQUIRED/OPTIONAL/DISABLED + grace period + enforcement serveur |
| ID-003 | P0 | DONE | Step-up MFA pour actions sensibles | challenge récent requis sur actions configurées |
| ID-004 | P1 | TODO | Modes d'inscription MEMBER `OPEN / EMAIL_VERIFICATION / CLUB_APPROVAL / INVITE_ONLY / CLOSED` | policy club + workflow complet |
| ID-005 | P1 | TODO | Gestion des appareils/sessions | liste + révocation session unique + logout all |
| ID-006 | P1 | TODO | Accès temporaire `validFrom/validUntil` | garde d'expiration serveur + UI admin |

# C. Club Hub — gouvernance interne

| ID | Priorité | Statut | Tâche | Critère de fin |
|---|---|---|---|---|
| CLUB-001 | P0 | DONE | Maker/checker sur opérations sensibles | séparation préparer/soumettre/approuver/publier |
| CLUB-002 | P0 | DONE | Workflow éditorial News | DRAFT→SUBMITTED→REVIEW→APPROVED/SCHEDULED/PUBLISHED + reapproval |
| CLUB-003 | P0 | DONE | Workflow Communiqués officiels avec niveau d'approbation par catégorie | SANCTION/DECISION peuvent exiger dual approval |
| CLUB-004 | P0 | DONE | Workflow d'approbation produits de la boutique club | DRAFT/SUBMITTED/APPROVED/PUBLISHED/REJECTED + price reapproval |
| CLUB-005 | P1 | DONE | Paramètres publics centralisés pour formulaires | académie/recrutement/sponsor/seller/contact + ouverture/fermeture/rate limit |
| CLUB-006 | P1 | TODO | Candidatures académie enrichies | pre-screening, trial, technical/admin approval, création Player contrôlée |
| CLUB-007 | P1 | TODO | Recrutement enrichi | scout/coach/trial/directeur sportif/negotiation workflow |
| CLUB-008 | P1 | TODO | Sponsoring : revue, négociation, contrat, activation, expiration | workflow + double validation selon montant |
| CLUB-009 | P1 | TODO | Déplacements avec approbation/budget/consentements | workflow + seuils + justificatifs |
| CLUB-010 | P1 | TODO | Entraînements paramétrables | deadlines réponses, lock, notifications, templates |
| CLUB-011 | P1 | TODO | Règles disciplinaires versionnées par compétition/catégorie/saison | RuleSet + override audité |
| CLUB-012 | P1 | TODO | Rôles temporaires et délégations | validFrom/validUntil + permissions déléguées bornées |
| CLUB-013 | P1 | TODO | Presets médicaux séparés Médecin/Kiné/Responsable médical | permissions minimales distinctes |

# D. Player Hub

| ID | Priorité | Statut | Tâche | Critère de fin |
|---|---|---|---|---|
| PLAYER-001 | P1 | TODO | Demandes de modification de profil sensibles | champs simples directs, identité sportive soumise à approbation |
| PLAYER-002 | P1 | TODO | Disponibilité structurée AVAILABLE/UNAVAILABLE/LIMITED | période + raison + consommation côté staff |
| PLAYER-003 | P1 | TODO | Portefeuille documentaire réglementaire en lecture | licence/contrat/inscription/FIT/suspension/expiration sans fuite médicale |
| PLAYER-004 | P1 | TODO | Consentements/signatures joueur | contrat/transfert/licence/image/règlement + historique |
| PLAYER-005 | P2 | TODO | Demandes administratives joueur | attestations/documents/rendez-vous avec suivi |

# E. Staff Hub

| ID | Priorité | Statut | Tâche | Critère de fin |
|---|---|---|---|---|
| STAFF-001 | P0 | DONE | Composition proposée par adjoint et approuvée par coach | DRAFT/PROPOSED/APPROVED/LOCKED + permissions |
| STAFF-002 | P1 | TODO | Paramètres de verrouillage composition avant coup d'envoi | policy compétition/club + garde serveur |
| STAFF-003 | P1 | TODO | Validation des plans d'entraînement | approval optional/configurable |
| STAFF-004 | P1 | TODO | Revue/verrouillage des statistiques après match | délai configurable + audit corrections |
| STAFF-005 | P1 | TODO | Délégation HEAD_COACH temporaire | match/période bornée + contrôle qualification |

# F. Medical Hub

| ID | Priorité | Statut | Tâche | Critère de fin |
|---|---|---|---|---|
| MED-001 | P0 | DONE | Journal médical append-only structuré | table followups + auteur/date/pièces + migration |
| MED-002 | P0 | DONE | Return-to-Play structuré | INJURED→TREATMENT→INDIVIDUAL→PARTIAL→FULL→CLEARANCE→AVAILABLE |
| MED-003 | P0 | DONE | Clearance médical configurable | second avis possible pour blessure sévère |
| MED-004 | P0 | DONE | Tests de non-divulgation des données médicales | coach/staff/player ne voient jamais diagnostic/documents |
| MED-005 | P1 | TODO | Stockage objet/chiffrement/antivirus documents médicaux | uploads sûrs + signed URLs + audit accès |
| MED-006 | P1 | TODO | Politique de rétention des données médicales | durée et purge contrôlée/auditée |

# G. Referee Hub / arbitrage

| ID | Priorité | Statut | Tâche | Critère de fin |
|---|---|---|---|---|
| REF-001 | P0 | DONE | Acceptation/refus d'une désignation | PENDING_ACCEPTANCE→ACCEPTED/DECLINED + deadline + motif |
| REF-002 | P0 | DONE | Demande de remplacement par arbitre | request→federation review→replacement, jamais auto-réaffectation |
| REF-003 | P1 | TODO | Policies d'indisponibilité | préavis, durée max, récurrence, justificatif selon raison |
| REF-004 | P1 | TODO | Policies des rapports officiels | obligatoire par rôle, deadline, reminder, amendment workflow |
| REF-005 | P1 | TODO | Déclaration/conflit d'intérêts avant acceptation | garde et audit |
| REF-006 | P1 | TODO | Politique de désignation MANUAL/SUGGESTED/AUTO | critères grade/dispo/repos/distance/historique |
| REF-007 | P1 | TODO | Versionnement des grilles d'évaluation officielles | criteriaVersion + saison/compétition + non-rétroactivité |

# H. ArbiNote

| ID | Priorité | Statut | Tâche | Critère de fin |
|---|---|---|---|---|
| ARBI-001 | P1 | TODO | Voting policy par compétition | anonymous/members/verified + fenêtres vote |
| ARBI-002 | P1 | TODO | Seuil minimal avant score visible | minimumVotesBeforeScoreVisible |
| ARBI-003 | P1 | TODO | Quarantaine automatique configurable votes suspects | threshold + audit + modération humaine |
| ARBI-004 | P1 | TODO | Critères publics versionnés | criteriaSetId/effective season + non-rétroactivité |

# I. Match Operations

| ID | Priorité | Statut | Tâche | Critère de fin |
|---|---|---|---|---|
| MATCH-001 | P0 | DONE | `CompetitionMatchProtocol` configurable | deadlines, joueurs banc, substitutions, signatures, officiels requis |
| MATCH-002 | P0 | DONE | Workflow d'amendement d'une feuille signée | AMENDMENT_REQUESTED→AMENDED→RE_SIGNED, jamais mutation silencieuse |
| MATCH-003 | P0 | DONE | Policy corrections post-signature | fenêtre + approbation fédération configurable |
| MATCH-004 | P1 | TODO | Policy offline PWA | durée, signature locale, idempotence, conflits de synchro |

# J. Ticketing

| ID | Priorité | Statut | Tâche | Critère de fin |
|---|---|---|---|---|
| TICK-001 | P0 | DONE | Workflow ouverture vente | DRAFT→REVIEW→APPROVED→SCHEDULED→OPEN/PAUSED/CLOSED |
| TICK-002 | P0 | DONE | Approbation prix/reapproval après modification | settings club + garde serveur |
| TICK-003 | P1 | TODO | Billets invitations/gratuits | quota + approbation + traçabilité |
| TICK-004 | P1 | TODO | Gestion des appareils scanner | device registry + révocation + key version + last sync |
| TICK-005 | P1 | TODO | Politique d'entrée stade | ouverture/fermeture gates + validité offline manifest |
| TICK-006 | P1 | TODO | Transfert de billet | activation, deadline, max transfers, audit |
| TICK-007 | P2 | TODO | Abonnements saison | entitlement multi-match + renouvellement |
| TICK-008 | P2 | TODO | Promotions/packages/tarification contrôlée | règles explicites + audit |

# K. Payments

| ID | Priorité | Statut | Tâche | Critère de fin |
|---|---|---|---|---|
| PAY-001 | P0 | DONE | Payment routing policy | provider enabled/default/fallback par consommateur |
| PAY-002 | P0 | DONE | Politique de remboursement par seuil | auto/single/dual approval selon montant |
| PAY-003 | P0 | DONE | SLA de `MANUAL_REVIEW` | délai + reminder + escalation + dashboard |
| PAY-004 | P1 | DONE | Ledger financier | gross/providerFee/platformFee/clubNet/sellerNet/refund/settlement |
| PAY-005 | P1 | DONE | Réconciliation provider/interne | file d'écarts + résolution auditée |

# L. Notifications

| ID | Priorité | Statut | Tâche | Critère de fin |
|---|---|---|---|---|
| NOTIF-001 | P1 | DONE | NotificationPolicy organisationnelle | canal mandatory/default/disabled par type/catégorie |
| NOTIF-002 | P1 | DONE | Quiet hours et timezone | urgences bypass, autres différées |
| NOTIF-003 | P1 | DONE | Digests IMMEDIATE/HOURLY/DAILY | agrégation idempotente |
| NOTIF-004 | P1 | DONE | Escalade des notifications critiques non lues | délai + destinataire de secours |
| NOTIF-005 | P1 | DONE | Workflow/versionnement templates | DRAFT→SUBMITTED→APPROVED→ACTIVE→ARCHIVED |

# M. Club OB / espace membre public

| ID | Priorité | Statut | Tâche | Critère de fin |
|---|---|---|---|---|
| OB-001 | P1 | DONE | Public Forms settings consommés depuis Club Hub | aucune logique d'autorisation dans le frontend public |
| OB-002 | P1 | DONE | Membership types FAN/SOCIO/VIP/SUPPORTER/PARTNER | droits/expiration/approbation configurables |
| OB-003 | P1 | DONE | Intégration membership → prévente Ticketing | règle serveur, pas simple claim client |
| OB-004 | P1 | DONE | PublicContentPolicy | sections activables + programmation publication + emergency banner |

# N. Federation Hub — politiques réglementaires

| ID | Priorité | Statut | Tâche | Critère de fin |
|---|---|---|---|---|
| FED-001 | P0 | DONE | Regulatory Policy Center | écran central des exigences par scope/saison/compétition |
| FED-002 | P0 | DONE | Templates réglementaires par compétition | contrat/médical/licence/coach/assurance/stade/finance configurables |
| FED-003 | P0 | DONE | Exigences documentaires configurables | mandatory/validity/signature/verification |
| FED-004 | P0 | DONE | Délégation Fédération → Ligue par opération | compétence explicite et garde serveur |
| FED-005 | P0 | DONE | Commission/quorum réellement branché discipline/appels/licensing | décision impossible sans quorum/policy quand activé |
| FED-006 | P1 | DONE | Assurances club/personnes — UI et guards réels | workflow + expirations + exigences compétition |
| FED-007 | P1 | DONE | Subventions — workflow complet | programme→candidature→review→paiement→justificatifs |
| FED-008 | P1 | DONE | Droits TV — règles calculables/versionnées | calcul→approval→club review→paid/disputed |
| FED-009 | P1 | DONE | Indemnités de formation/solidarité | calcul explicable + bénéficiaires + contestation + paiement |
| FED-010 | P1 | DONE | SLA réglementaires | paramètres par domaine + files overdue |
| FED-011 | P1 | DONE | Mode migration permissions `LEGACY/WARN/ENFORCE` | passage contrôlé vers whitelist complète |

# O. Infrastructure / exploitation

| ID | Priorité | Statut | Tâche | Critère de fin |
|---|---|---|---|---|
| OPS-001 | P0 | TODO | Protection branche `main` | PR obligatoire + checks CI/ownership + no direct push si supporté par GitHub |
| OPS-002 | P0 | DONE | Documentation canonique des capacités | `docs/platform-capabilities.md` + correction docs obsolètes |
| OPS-003 | P1 | DONE | CODEOWNERS par domaine | ownership explicite identity/payments/medical/db/github |
| OPS-004 | P1 | TODO | Stockage objet + antivirus pour uploads non médicaux | S3/MinIO/R2 compatible + validation MIME/size + signed URL |
| OPS-005 | P1 | TODO | Operations Center outbox/webhooks/sagas | pending/failure/retry/resolve audité |
| OPS-006 | P1 | TODO | Health dashboard plateforme | santé des apps/services + dépendances critiques |
| OPS-007 | P2 | TODO | API Gateway | routage unique + TLS + rate limit + request-id/tracing |
| OPS-008 | P1 | TODO | Observabilité métier | métriques files critiques marketplace/licences/payments/tickets/sagas |
| OPS-009 | P1 | TODO | Rotation standard des secrets service-to-service | current/previous/expires/keyId partout |
| OPS-010 | P0 | IN_PROGRESS | Matrice de tests de policies/scopes | valeurs on/off/modes + cross-tenant/scopes obligatoires |

---

# Ordre d'exécution recommandé

1. `GOV-001` → `GOV-005` : fondations communes.
2. `OPS-002` + `OPS-010` : documentation et gates pour éviter la dérive.
3. `ID-001` → `ID-003`, `CLUB-001` → `CLUB-004`.
4. `REF-001`/`REF-002`, `MATCH-001` → `MATCH-003`.
5. `TICK-001`/`TICK-002`, `PAY-001` → `PAY-003`.
6. `FED-001` → `FED-005`.
7. Medical P0, puis autres P1 par domaine.
8. P2 seulement après fermeture des P0/P1 bloquants.

## Definition of Done globale

- aucune policy métier sensible uniquement appliquée côté UI ;
- `teamId`/federationId/leagueId et scopes dérivés côté serveur ;
- transitions importantes auditées ;
- motifs obligatoires pour refus/override/exception ;
- tests de tenant isolation et rôles/scopes ;
- migrations enregistrées dans `db/migrations.manifest` quand nécessaires ;
- READMEs et `docs/platform-capabilities.md` alignés avec le code réellement fusionné ;
- CI et Ownership boundaries vertes avant merge de chaque lot.
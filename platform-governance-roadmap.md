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
- 2026-08-18 — CI #939 + Ownership #468 : `PAY-003` validé. Payments applique un SLA `MANUAL_REVIEW` versionné par consommateur avec snapshot par cycle, reminder et escalation idempotents sous verrou, retry si Notifications n'accepte pas l'alerte, dashboard opérateur plateforme et édition de policy via Federation Hub ; migration TypeORM et runner de migrations autonome alignés, lint/build/tests Payments et Federation Hub ainsi que la matrice CI globale sont verts.

---

# A. Fondations transverses

| ID | Priorité | Statut | Tâche | Critère de fin |
|---|---|---|---|---|
| GOV-001 | P0 | DONE | Architecture commune de policies/settings avec héritage PLATFORM → FEDERATION → LEAGUE → SEASON/COMPETITION → CLUB | package partagé typé + tests de résolution/héritage + documentation d'usage |
| GOV-002 | P0 | DONE | Modèle commun d'approbation `AUTO / SINGLE_APPROVAL / DUAL_APPROVAL / COMMISSION` | types partagés + règles maker/checker + tests |
| GOV-003 | P0 | DONE | Interdire l'auto-approbation quand `makerCheckerEnabled=true` | garde serveur réutilisable + tests |
| GOV-004 | P0 | IN_PROGRESS | Versionner les policies importantes (`version`, `effectiveFrom`, `effectiveUntil`) | résolution temporelle + conservation de la version utilisée |
| GOV-005 | P0 | IN_PROGRESS | Audit standard des changements de configuration | before/after/actor/reason/IP/User-Agent + tests |
| GOV-006 | P1 | TODO | Panneau "Configuration effective" avec origine de chaque valeur héritée | UI + API de résolution expliquant la provenance |
| GOV-007 | P1 | TODO | Centre transversal des exceptions/dérogations | modèle borné dans le temps + motif + référence + audit |
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
| CLUB-005 | P1 | TODO | Paramètres publics centralisés pour formulaires | académie/recrutement/sponsor/seller/contact + ouverture/fermeture/rate limit |
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
| PAY-004 | P1 | TODO | Ledger financier | gross/providerFee/platformFee/clubNet/sellerNet/refund/settlement |
| PAY-005 | P1 | TODO | Réconciliation provider/interne | file d'écarts + résolution auditée |

# L. Notifications

| ID | Priorité | Statut | Tâche | Critère de fin |
|---|---|---|---|---|
| NOTIF-001 | P1 | TODO | NotificationPolicy organisationnelle | canal mandatory/default/disabled par type/catégorie |
| NOTIF-002 | P1 | TODO | Quiet hours et timezone | urgences bypass, autres différées |
| NOTIF-003 | P1 | TODO | Digests IMMEDIATE/HOURLY/DAILY | agrégation idempotente |
| NOTIF-004 | P1 | TODO | Escalade des notifications critiques non lues | délai + destinataire de secours |
| NOTIF-005 | P1 | TODO | Workflow/versionnement templates | DRAFT→SUBMITTED→APPROVED→ACTIVE→ARCHIVED |

# M. Club OB / espace membre public

| ID | Priorité | Statut | Tâche | Critère de fin |
|---|---|---|---|---|
| OB-001 | P1 | TODO | Public Forms settings consommés depuis Club Hub | aucune logique d'autorisation dans le frontend public |
| OB-002 | P1 | TODO | Membership types FAN/SOCIO/VIP/SUPPORTER/PARTNER | droits/expiration/approbation configurables |
| OB-003 | P1 | TODO | Intégration membership → prévente Ticketing | règle serveur, pas simple claim client |
| OB-004 | P1 | TODO | PublicContentPolicy | sections activables + programmation publication + emergency banner |

# N. Federation Hub — politiques réglementaires

| ID | Priorité | Statut | Tâche | Critère de fin |
|---|---|---|---|---|
| FED-001 | P0 | TODO | Regulatory Policy Center | écran central des exigences par scope/saison/compétition |
| FED-002 | P0 | TODO | Templates réglementaires par compétition | contrat/médical/licence/coach/assurance/stade/finance configurables |
| FED-003 | P0 | TODO | Exigences documentaires configurables | mandatory/validity/signature/verification |
| FED-004 | P0 | TODO | Délégation Fédération → Ligue par opération | compétence explicite et garde serveur |
| FED-005 | P0 | TODO | Commission/quorum réellement branché discipline/appels/licensing | décision impossible sans quorum/policy quand activé |
| FED-006 | P1 | TODO | Assurances club/personnes — UI et guards réels | workflow + expirations + exigences compétition |
| FED-007 | P1 | TODO | Subventions — workflow complet | programme→candidature→review→paiement→justificatifs |
| FED-008 | P1 | TODO | Droits TV — règles calculables/versionnées | calcul→approval→club review→paid/disputed |
| FED-009 | P1 | TODO | Indemnités de formation/solidarité | calcul explicable + bénéficiaires + contestation + paiement |
| FED-010 | P1 | TODO | SLA réglementaires | paramètres par domaine + files overdue |
| FED-011 | P1 | TODO | Mode migration permissions `LEGACY/WARN/ENFORCE` | passage contrôlé vers whitelist complète |

# O. Infrastructure / exploitation

| ID | Priorité | Statut | Tâche | Critère de fin |
|---|---|---|---|---|
| OPS-001 | P0 | TODO | Protection branche `main` | PR obligatoire + checks CI/ownership + no direct push si supporté par GitHub |
| OPS-002 | P0 | DONE | Documentation canonique des capacités | `docs/platform-capabilities.md` + correction docs obsolètes |
| OPS-003 | P1 | TODO | CODEOWNERS par domaine | ownership explicite identity/payments/medical/db/github |
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

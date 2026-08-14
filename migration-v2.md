# Migration V2 — Gestion administrative fédérale des clubs

## 1. Contexte

Le monorepo `foot` constitue déjà un écosystème football multi-applications couvrant une grande partie des opérations quotidiennes d'une fédération, d'une ligue et des clubs.

Applications principales existantes :

- `federation-hub` : administration fédérale, référentiels, clubs, compétitions, saisons, journées, matchs, arbitrage, évaluations officielles et audit.
- `club-hub` : gestion administrative et opérationnelle des clubs.
- `player-hub` : espace joueur.
- `staff-hub` : espace staff technique.
- `medical-hub` : espace médical.
- `referee-hub` : espace privé des arbitres.
- `match-operations` : feuille de match électronique.
- `arbinote` : perception publique des arbitres.
- `identity` : authentification et identités.
- `ticketing` : billetterie.
- `marketplace` / `seller-portal` : marketplace multi-vendeurs.
- `payments` : paiements.
- `notifications` : notifications multi-canaux.
- `club-ob` : site public custom de l'Olympique de Béja.

La plateforme couvre déjà correctement :

- joueurs et staff ;
- entraînements ;
- convocations ;
- compositions ;
- tactiques ;
- statistiques ;
- blessures ;
- déplacements ;
- discipline sportive basique ;
- arbitrage ;
- évaluations d'arbitres ;
- feuille de match ;
- billetterie ;
- paiements ;
- marketplace ;
- notifications ;
- authentification ;
- audit de plusieurs domaines.

Le principal manque concerne désormais les **processus réglementaires fédéraux permettant à une fédération de gérer administrativement les clubs**.

Cette migration doit faire évoluer `federation-hub` d'un back-office de référentiels vers un véritable **système d'information fédéral**.

---

# 2. Objectif général

Implémenter le cycle administratif fédéral complet d'un club :

```text
AFFILIATION CLUB
      ↓
LICENCE / CONFORMITÉ CLUB
      ↓
ENGAGEMENT COMPÉTITION
      ↓
CONTRATS
      ↓
LICENCES DES PERSONNES
      ↓
ENREGISTREMENT JOUEURS
      ↓
TRANSFERTS
      ↓
QUALIFICATION / ÉLIGIBILITÉ
      ↓
MATCH
      ↓
DISCIPLINE
      ↓
LITIGES / APPELS
      ↓
CONTRÔLE FINANCIER
      ↓
RENOUVELLEMENT SAISON
```

L'architecture fonctionnelle cible est :

```text
club-hub
    "le club prépare, dépose, répond et suit"

            ↓

federation-hub
    "la fédération contrôle, valide, rejette,
     demande des corrections ou sanctionne"
```

Les clubs ne doivent jamais pouvoir valider eux-mêmes un processus réglementaire fédéral.

---

# 3. Principes d'architecture obligatoires

## 3.1 Ne pas créer une nouvelle application

Les nouveaux domaines doivent être intégrés principalement dans :

### `federation-hub`

```text
/admin/clubs
/admin/club-licensing
/admin/licenses
/admin/registrations
/admin/contracts
/admin/transfers
/admin/transfer-windows
/admin/competition-entries
/admin/eligibility
/admin/legal-cases
/admin/discipline
/admin/appeals
/admin/sanctions
/admin/financial-compliance
/admin/stadium-licensing
/admin/coach-licenses
/admin/agents
```

### `club-hub`

Créer un espace :

```text
/admin/federation
```

avec :

```text
/admin/federation/dossier
/admin/federation/licenses
/admin/federation/contracts
/admin/federation/registrations
/admin/federation/transfers
/admin/federation/competition-entries
/admin/federation/compliance
/admin/federation/sanctions
/admin/federation/legal-cases
```

---

## 3.2 Réutiliser les données existantes

Ne pas dupliquer les domaines déjà présents.

Exemples :

- `Player` reste la source principale du joueur.
- les équipes/clubs restent dans `teams`.
- les saisons restent dans `seasons`.
- les compétitions restent dans `competitions`.
- les matchs restent dans `matches`.
- les suspensions/cartons existants doivent être réutilisés lorsque possible.
- `cms_injuries` reste propriétaire des données médicales détaillées.
- `identity` reste propriétaire de l'identité et de l'authentification.
- `notifications` doit être utilisé pour toutes les notifications réglementaires.
- `payments` doit être utilisé si des droits réglementaires doivent être payés.

---

## 3.3 Séparer données métier et données confidentielles

Exemple médical :

`medical-hub` peut connaître :

- diagnostic ;
- document médical ;
- notes ;
- protocole de reprise.

`federation-hub` ne doit connaître que :

```text
FIT
UNFIT
PENDING
EXPIRED
```

Aucun diagnostic médical détaillé ne doit être exposé à la fédération sauf obligation légale explicitement modélisée.

---

## 3.4 Tous les workflows doivent être auditables

Chaque changement important doit avoir :

- auteur ;
- rôle ;
- date ;
- ancienne valeur ;
- nouvelle valeur ;
- IP si disponible ;
- User-Agent si disponible ;
- motif ;
- référence de dossier.

Les validations réglementaires doivent être traçables de bout en bout.

---

# 4. Priorités

# P0 — Processus indispensables

1. Licence et conformité du club.
2. Licences individuelles.
3. Enregistrement des joueurs par saison/compétition.
4. Homologation des contrats joueurs.
5. Homologation des contrats entraîneurs/staff.
6. Engagement des clubs aux compétitions.
7. Fenêtres de transfert.
8. Qualification / éligibilité des joueurs.
9. Sanctions et interdictions de recrutement.
10. Litiges.
11. Workflow de renouvellement de saison.

# P1 — Processus importants

12. Contrôle financier réglementaire.
13. Gouvernance / comité directeur.
14. Homologation des stades.
15. Qualifications CAF des entraîneurs.
16. Aptitude médicale fédérale.
17. Agents / intermédiaires.
18. Discipline fédérale avancée.
19. Appels.

# P2 — Processus complémentaires

20. Assurances.
21. Subventions.
22. Répartition de droits TV.
23. Indemnités de formation.
24. Mécanismes de solidarité.
25. Contrôle réglementaire documentaire avancé.

## Suivi d'implémentation

- ✅ **P0-001 — Licence et conformité du club** : schéma, workflow audité,
  contrôle des scopes club/fédération/ligue, documents versionnés, APIs,
  notifications de transition et interfaces FR/AR dans `club-hub` et
  `federation-hub`.
- ✅ **P0-002 — Licences individuelles** : modèle polymorphe réutilisant les
  référentiels existants, numéro unique, documents versionnés, workflow
  audité, contrôle d'expiration, scopes serveur, notifications et interfaces
  FR/AR dans `club-hub` et `federation-hub`.
- ✅ **P0-003 — Enregistrement des joueurs** : rattachement joueur/club à une
  compétition-saison, licence `PLAYER` active obligatoire, workflow audité,
  projection d'éligibilité, scopes serveur, notifications et interfaces dans
  `club-hub` et `federation-hub`. Dans le modèle existant, `saisons` porte déjà
  l'édition et le type de compétition ; `season_id` est donc le périmètre
  compétition-saison de l'inscription.
- ✅ **P0-004 — Contrats joueurs** : contrats financiers et sportifs, documents
  versionnés, signature, homologation fédérale, audit, notifications,
  résiliation sans suppression et interfaces club/fédération. L'exigence de
  contrat est configurable par compétition-saison et bloque l'inscription
  P0-003 lorsque l'homologation est absente, annulée ou expirée.
- ✅ **P0-005 — Contrats entraîneurs et staff** : contrats versionnés et audités,
  signature, soumission, homologation, résiliation sans suppression et contrôle
  d’éligibilité. Lorsque la saison l’exige, le contrat ne peut être soumis ni
  homologué sans une qualification `COACH`, `STAFF`, `MEDICAL` ou `DIRECTOR`
  approuvée, non expirée et rattachée au même staff, club et saison.
- ⬜ **P0-006 — Engagement des clubs aux compétitions**, **P0-007 — Fenêtres de
  transfert** et **P0-008 — Qualification/éligibilité** : non traités dans
  cette migration, sur demande explicite (reprise directement à P0-009).
  `player_transfers` (préexistant, `club-hub`) reste donc utilisé sans notion
  de fenêtre, et il n'existe pas de `EligibilityService` central : les
  contrôles d'éligibilité restent ceux déjà en place au niveau de chaque
  domaine (licence, contrat, sanction) plus `LineupService.filterEligibleAtMatchDate`
  côté `match-operations`. À traiter avant toute activation stricte des
  blocages de fenêtre de transfert ou d'engagement compétition.
- ✅ **P0-009 — Sanctions clubs** : `club_sanctions` + historique audité,
  scopes fédération/ligue serveur, création/suspension/réactivation/levée
  avec motif obligatoire, notifications `CLUB_SANCTION_CREATED`/
  `CLUB_SANCTION_LIFTED`, interfaces FR/EN/AR (`federation-hub`) et FR/AR en
  lecture seule (`club-hub`). `TRANSFER_BAN` bloque désormais l'homologation
  fédérale d'un transfert (`PlayerTransferService.completeTransfer`) et
  `REGISTRATION_BAN` bloque l'approbation d'une inscription joueur
  (`playerRegistrations.transitionPlayerRegistration`). `COMPETITION_BAN`/
  `COMPETITION_EXCLUSION` sont modélisés et exposés mais non appliqués
  automatiquement (aucun workflow d'engagement compétition en base, voir
  P0-006 ci-dessus) : à brancher lorsque ce lot sera traité.
- ✅ **P0-010 — Litiges** : `legal_cases` + `legal_case_documents`/`legal_case_hearings`/
  `legal_case_decisions`/`legal_case_events`, parties polymorphes (club,
  joueur, coach, staff, agent, fédération), numéro de dossier unique généré
  serveur, workflow audité (recevabilité, instruction, audience, décision,
  appel, clôture, retrait), scopes fédération/ligue serveur, notifications
  (`LEGAL_CASE_CREATED`, `LEGAL_CASE_HEARING_SCHEDULED`, `LEGAL_CASE_DECIDED`,
  `LEGAL_CASE_STATUS_CHANGED`) et interfaces FR/EN/AR (`federation-hub`) et
  FR/AR (`club-hub`, lecture des dossiers où le club est partie + dépôt de
  pièces/réponse, jamais de changement de statut). L'ouverture d'un dossier
  reste un acte fédéral (conforme à la doc : le club ne fait que « déposer
  une réponse »), pas une auto-saisie par le club.
- ✅ **P0-011 — Renouvellement saisonnier** : `season_regulatory_cycles` +
  historique audité, un cycle par saison (`DRAFT → ACTIVE → CLOSED`),
  fenêtres de licence club et d'inscription joueurs pilotées par dates
  (ouverture/fermeture indépendantes), expiration automatique et idempotente
  des licences club/personnes `APPROVED` de la saison précédente à la
  clôture du cycle, notifications (`CLUB_LICENSING_WINDOW_OPENED`,
  `REGISTRATION_WINDOW_OPENED`) et interface `federation-hub` (FR/EN/AR).
  Les fenêtres sont branchées comme garde serveur sur la soumission d'une
  licence club (`ClubLicenseService.submitClubLicenseApplication`) et d'une
  inscription joueur (`PlayerRegistrationService.submitPlayerRegistration`)
  côté `club-hub` : une saison sans cycle reste ouverte (comportement
  historique inchangé, §36), un cycle `CLOSED` ou une fenêtre non encore
  ouverte bloque la soumission. Pas d'UI `club-hub` dédiée : c'est un outil
  interne à la fédération, le club voit seulement l'effet (soumission
  acceptée ou refusée).
- ⬜ **P0-012 et suivants** : cette migration passe désormais aux processus P1.
- ✅ **P1-001 — Conformité financière** : `club_financial_compliance` +
  historique audité, un dossier par club/saison (contrainte d'unicité),
  workflow audité (`DRAFT → SUBMITTED → UNDER_REVIEW → COMPLIANT/CONDITIONAL
  /NON_COMPLIANT`, `NON_COMPLIANT` réouvrable en `DRAFT`), scopes
  fédération/ligue serveur, notifications (`FINANCIAL_COMPLIANCE_SUBMITTED`,
  `FINANCIAL_COMPLIANCE_DECIDED`) et interfaces `club-hub` (dépôt/soumission,
  FR/AR) + `federation-hub` (revue/décision, FR/EN/AR). Volontairement pas
  un système comptable complet : uniquement les agrégats déclaratifs
  (budget, masse salariale, dettes par catégorie) nécessaires à la décision
  fédérale, conformément au périmètre du document.
- ✅ **P1-002 — Gouvernance et comité directeur** : `club_board_mandates` +
  `club_board_members` + historique audité, workflow de mandat audité
  (`DRAFT → SUBMITTED → VALIDATED/REJECTED`, `REJECTED` réouvrable en
  `DRAFT`, `VALIDATED → ENDED`), validation fédérale globale d'un mandat qui
  approuve en bloc tous ses membres courants, approbation individuelle pour
  tout membre ajouté ensuite (remplacement en cours de mandat), scopes
  fédération/ligue serveur, notifications (`BOARD_MANDATE_SUBMITTED`,
  `BOARD_MANDATE_VALIDATED`, `BOARD_MANDATE_REJECTED`, `BOARD_MANDATE_ENDED`)
  et interfaces `club-hub` (dépôt du mandat, ajout de membres, soumission,
  FR/AR) + `federation-hub` (validation/rejet, approbation des membres,
  FR/EN/AR).
- ✅ **P1-003 — Homologation des stades** : `stadium_inspections` +
  `stadium_restrictions` + historique audité, réutilise `cms_stadiums`
  (référentiel riche des stades déjà propriété de `club-hub`) sans le
  dupliquer — lu en lecture seule par `federation-hub` via requête directe,
  comme le fait déjà `staffContracts.ts` pour `cms_staff`. Sept aspects
  d'inspection (terrain, éclairage, vestiaires, sécurité, capacité, médical,
  médias) + VAR optionnel, workflow audité (`PENDING → APPROVED/
  APPROVED_WITH_RESTRICTIONS/REJECTED`, `APPROVED(_WITH_RESTRICTIONS) →
  SUSPENDED → APPROVED`), réserves versionnées en cas d'homologation sous
  réserve, scopes fédération/ligue serveur, notification
  (`STADIUM_INSPECTION_DECIDED`) et interface `federation-hub` (FR/EN/AR).
  Pas d'UI `club-hub` : le document ne prévoit cette homologation que côté
  fédération (§33/§34).
- ✅ **P1-004 — Qualifications entraîneurs (CAF)** : `coach_qualifications` +
  historique audité, distinct de `person_licenses` (P0-002, enregistrement
  administratif saisonnier) — ici un diplôme technique permanent
  (`CAF_PRO`/`CAF_A`/`CAF_B`/`CAF_C`/`NATIONAL`/`OTHER`) rattaché à la
  personne. `staff_contracts.qualification_id` (P0-005) continue de
  référencer `person_licenses` sans changement, aucune donnée migrée entre
  les deux domaines. Workflow audité (`PENDING → VALID/REVOKED`,
  `VALID → EXPIRED/SUSPENDED/REVOKED`, `SUSPENDED → VALID/REVOKED`),
  colonne `saisons.minimum_head_coach_qualification` avec comparateur de
  niveau (`meetsMinimumQualification`), scopes fédération/ligue serveur,
  notifications et interfaces `club-hub` (soumission, FR/AR) +
  `federation-hub` (validation/décision, FR/EN/AR). Le niveau minimum par
  saison est modélisé et exposé mais pas encore appliqué automatiquement à
  la désignation d'un entraîneur principal : aucun domaine "responsable
  technique de match" n'existe dans ce dépôt pour porter ce contrôle
  (P0-006/P0-008 hors périmètre de cette migration, voir note P0-009).
- ✅ **P1-005 — Aptitude médicale fédérale** : `medical_eligibilities` +
  historique audité, un dossier par joueur/saison (contrainte d'unicité,
  réouverture explicite `UNFIT → PENDING` pour une nouvelle visite). Statut
  d'aptitude uniquement (`PENDING`/`FIT`/`UNFIT`/`EXPIRED`/`SUSPENDED`) —
  **aucun champ diagnostic** dans le schéma ni dans les interfaces,
  conformément à §3.3 : le détail médical reste dans `cms_injuries`
  (club-hub). Workflow audité, scopes fédération/ligue serveur,
  notifications et interfaces `club-hub` (dépôt du certificat, FR/AR) +
  `federation-hub` (décision FIT/UNFIT, FR/EN/AR). La validation est portée
  par `federation-hub` (rôle fédéral) plutôt que par `medical-hub` : ce
  dernier n'a pas été audité dans cette migration, brancher son propre rôle
  médical comme validateur est un prolongement possible mais hors
  périmètre ici.

---

# 5. P0-001 — Licence et conformité du club

## Objectif

Créer un véritable dossier réglementaire permettant à la fédération de décider si un club est autorisé à participer aux compétitions d'une saison.

## Modèle

Créer une entité/table `club_license_applications`.

Champs minimum :

```text
id
clubId
seasonId
federationId
leagueId nullable
status
submittedAt
reviewStartedAt
approvedAt
rejectedAt
expiresAt
reviewerUserId
rejectionReason
createdAt
updatedAt
```

Statuts :

```text
DRAFT
SUBMITTED
UNDER_REVIEW
CHANGES_REQUESTED
APPROVED
REJECTED
SUSPENDED
EXPIRED
```

Créer `club_license_requirements`.

```text
id
applicationId
category
code
label
description
mandatory
status
reviewComment
reviewedBy
reviewedAt
```

Catégories :

```text
SPORTING
INFRASTRUCTURE
ADMINISTRATIVE
LEGAL
PERSONNEL
MEDICAL
FINANCIAL
```

Statuts exigence :

```text
PENDING
COMPLIANT
NON_COMPLIANT
WAIVED
```

Créer `club_license_documents`.

```text
id
applicationId
requirementId nullable
documentType
fileUrl
fileName
version
uploadedBy
uploadedAt
status
reviewComment
```

## Workflow

```text
DRAFT
  ↓ club
SUBMITTED
  ↓ fédération
UNDER_REVIEW
  ├── CHANGES_REQUESTED
  │       ↓ club corrige
  │    SUBMITTED
  │
  ├── APPROVED
  └── REJECTED
```

## UI club-hub

`/admin/federation/compliance`

Afficher :

- progression globale ;
- critères par catégorie ;
- documents manquants ;
- observations fédérales ;
- date limite ;
- statut ;
- bouton soumettre ;
- historique.

## UI federation-hub

`/admin/club-licensing`

Filtres :

- saison ;
- fédération ;
- ligue ;
- club ;
- statut.

Détail :

- dossier complet ;
- exigences ;
- documents ;
- commentaires ;
- historique ;
- valider ;
- demander correction ;
- rejeter ;
- suspendre.

## Notifications

Émettre :

```text
CLUB_LICENSE_SUBMITTED
CLUB_LICENSE_CHANGES_REQUESTED
CLUB_LICENSE_APPROVED
CLUB_LICENSE_REJECTED
CLUB_LICENSE_SUSPENDED
CLUB_LICENSE_EXPIRING
```

## Critères d'acceptation

- un club ne peut soumettre qu'un dossier de sa propre organisation ;
- un `LEAGUE_ADMIN` ne voit que les clubs de sa ligue ;
- un `FEDERATION_ADMIN` ne voit que les clubs de sa fédération ;
- `PLATFORM_SUPERADMIN` voit tout ;
- `APPROVED` est impossible si une exigence obligatoire est `NON_COMPLIANT`, sauf waiver explicite et audité ;
- toutes les transitions sont auditées.

---

# 6. P0-002 — Licences individuelles

## Objectif

Gérer les licences administratives des personnes liées aux compétitions.

Types :

```text
PLAYER
COACH
STAFF
MEDICAL
DIRECTOR
REFEREE
MATCH_OFFICIAL
```

Créer `person_licenses`.

```text
id
personType
personReferenceId
userId nullable
clubId nullable
federationId
leagueId nullable
seasonId
licenseType
licenseNumber
category
status
requestedAt
approvedAt
rejectedAt
expiresAt
approvedBy
rejectionReason
createdAt
updatedAt
```

Statuts :

```text
DRAFT
SUBMITTED
UNDER_REVIEW
APPROVED
REJECTED
SUSPENDED
EXPIRED
REVOKED
```

Créer `person_license_documents`.

## Règles

- un numéro de licence actif doit être unique ;
- une licence expirée ne rend pas une personne éligible ;
- une licence suspendue bloque l'éligibilité ;
- toutes les validations doivent être serveur-side.

## UI club-hub

`/admin/federation/licenses`

Le club peut :

- créer une demande ;
- téléverser les pièces ;
- soumettre ;
- suivre ;
- corriger.

## UI federation-hub

`/admin/licenses`

La fédération peut :

- filtrer ;
- examiner ;
- valider ;
- rejeter ;
- suspendre ;
- révoquer ;
- renouveler.

---

# 7. P0-003 — Enregistrement des joueurs par saison et compétition

## Objectif

Ne plus considérer qu'un joueur appartenant à un club est automatiquement autorisé à participer à toutes les compétitions.

Créer `player_registrations`.

```text
id
playerId
clubId
seasonId
competitionId
licenseId
contractId nullable
registeredAt
status
eligibilityStatus
validatedBy
validatedAt
rejectionReason
createdAt
updatedAt
```

Statuts :

```text
DRAFT
SUBMITTED
APPROVED
REJECTED
SUSPENDED
CANCELLED
```

Éligibilité :

```text
ELIGIBLE
INELIGIBLE
PENDING
```

## Règles

Un joueur doit avoir :

- licence active ;
- contrat valide si requis ;
- club autorisé dans la compétition ;
- aucune sanction bloquante ;
- aucune interdiction réglementaire ;
- aptitude médicale valide si requise.

---

# 8. P0-004 — Contrats joueurs

Créer `player_contracts`.

```text
id
playerId
clubId
seasonId
contractType
startDate
endDate
salary nullable
currency nullable
bonusesJson nullable
agentId nullable
signedAt
documentUrl
status
federationStatus
submittedAt
approvedAt
rejectedAt
approvedBy
rejectionReason
createdAt
updatedAt
```

Types possibles :

```text
PROFESSIONAL
AMATEUR
TRAINEE
YOUTH
OTHER
```

Statuts métier :

```text
DRAFT
SIGNED
TERMINATED
EXPIRED
```

Statut fédéral :

```text
NOT_SUBMITTED
SUBMITTED
UNDER_REVIEW
APPROVED
REJECTED
CANCELLED
```

## Workflow

```text
club prépare
   ↓
joueur / club signent
   ↓
SUBMITTED
   ↓
fédération contrôle
   ↓
APPROVED / REJECTED
```

## Règles

- pas d'enregistrement réglementaire du joueur lorsque le contrat requis n'est pas homologué ;
- conserver les versions des documents ;
- toute résiliation doit être historisée ;
- ne jamais supprimer physiquement un contrat homologué.

---

# 9. P0-005 — Contrats entraîneurs et staff

Créer `staff_contracts`.

```text
id
staffId
clubId
seasonId
role
startDate
endDate
salary nullable
currency nullable
qualificationId nullable
documentUrl
status
federationStatus
submittedAt
approvedAt
rejectedAt
rejectionReason
```

## Règle

Lorsque la compétition exige une qualification technique :

```text
contrat homologué
+
qualification valide
=
staff éligible
```

---

# 10. P0-006 — Engagement d'un club dans une compétition

Créer `competition_registrations`.

```text
id
competitionId
seasonId
clubId
teamId
category
submittedAt
status
clubLicenseId
stadiumApprovalId nullable
financialComplianceId nullable
feesAmount nullable
feesPaymentId nullable
approvedAt
approvedBy
rejectionReason
```

Statuts :

```text
DRAFT
SUBMITTED
UNDER_REVIEW
CHANGES_REQUESTED
APPROVED
REJECTED
WITHDRAWN
SUSPENDED
```

## Contrôles automatiques avant approbation

```text
licence club valide ?
sanction de participation ?
interdiction réglementaire ?
stade homologué ?
droits d'engagement payés ?
documents complets ?
```

## UI club-hub

`/admin/federation/competition-entries`

## UI federation-hub

`/admin/competition-entries`

---

# 11. P0-007 — Fenêtres de transfert

Créer `transfer_windows`.

```text
id
federationId
leagueId nullable
seasonId
competitionId nullable
type
opensAt
closesAt
status
exceptionPolicy nullable
createdBy
createdAt
updatedAt
```

Types :

```text
SUMMER
WINTER
SPECIAL
YOUTH
AMATEUR
```

Statuts :

```text
PLANNED
OPEN
CLOSED
SUSPENDED
```

## Intégration workflow transfert

Avant création/homologation d'un transfert :

```text
isTransferWindowOpen(...)
```

Sinon :

```text
TRANSFER_WINDOW_CLOSED
```

Une exception ne doit être possible que par un rôle fédéral autorisé avec :

- motif obligatoire ;
- audit ;
- référence juridique/réglementaire.

---

# 12. P0-008 — Qualification et éligibilité

Créer un service central :

```text
EligibilityService
```

Fonction principale :

```ts
checkPlayerEligibility({
  playerId,
  clubId,
  matchId,
  competitionId,
  seasonId
})
```

Retour :

```text
eligible: boolean
blockingReasons: []
warnings: []
```

Contrôles minimum :

```text
joueur membre du club à la date du match
licence active
enregistrement compétition approuvé
contrat valide si nécessaire
pas de suspension active
pas de transfert rendant le joueur inéligible
club autorisé dans la compétition
aptitude médicale valide si obligatoire
limite de catégorie/âge respectée
```

## Intégration `match-operations`

Avant ajout du joueur sur la feuille de match :

- appeler ou réutiliser la logique d'éligibilité ;
- empêcher la validation si raison bloquante ;
- afficher clairement le motif ;
- journaliser la tentative.

Aucun contrôle ne doit être uniquement frontend.

---

# 13. P0-009 — Sanctions clubs

Créer `club_sanctions`.

```text
id
clubId
seasonId nullable
competitionId nullable
sourceCaseId nullable
type
reason
startsAt
endsAt nullable
amountDue nullable
currency nullable
status
liftedAt nullable
liftedBy nullable
createdBy
createdAt
updatedAt
```

Types :

```text
TRANSFER_BAN
REGISTRATION_BAN
COMPETITION_BAN
FINE
POINT_DEDUCTION
MATCH_BEHIND_CLOSED_DOORS
STADIUM_SUSPENSION
COMPETITION_EXCLUSION
WARNING
```

Statuts :

```text
ACTIVE
SUSPENDED
LIFTED
EXPIRED
CANCELLED
```

## Règles

- `TRANSFER_BAN` bloque l'homologation de transfert ;
- `REGISTRATION_BAN` bloque les nouvelles inscriptions ;
- `COMPETITION_BAN` bloque l'engagement ;
- la levée doit être explicite, motivée et auditée.

---

# 14. P0-010 — Litiges

Créer `legal_cases`.

```text
id
caseNumber
federationId
leagueId nullable
seasonId nullable
category
claimantType
claimantId
respondentType
respondentId
status
filedAt
admissibilityReviewedAt nullable
hearingDate nullable
decidedAt nullable
decisionSummary nullable
amountAwarded nullable
currency nullable
deadline nullable
createdBy
assignedTo nullable
createdAt
updatedAt
```

Catégories :

```text
PLAYER_CLUB
COACH_CLUB
STAFF_CLUB
AGENT_PLAYER
AGENT_CLUB
CLUB_CLUB
CONTRACT
TRANSFER
DISCIPLINARY
FINANCIAL
OTHER
```

Statuts :

```text
FILED
ADMISSIBILITY_REVIEW
INADMISSIBLE
UNDER_REVIEW
HEARING_SCHEDULED
HEARD
DECIDED
APPEALED
CLOSED
WITHDRAWN
```

Créer :

- `legal_case_documents`
- `legal_case_hearings`
- `legal_case_decisions`
- `legal_case_events`

## UI club-hub

`/admin/federation/legal-cases`

Lecture des dossiers où le club est partie.

Le club peut :

- déposer une réponse ;
- ajouter des documents ;
- suivre les audiences ;
- consulter la décision.

## UI federation-hub

`/admin/legal-cases`

---

# 15. P0-011 — Renouvellement saisonnier

Créer un assistant annuel côté fédération.

## Objectif

À l'ouverture d'une nouvelle saison :

1. créer ou sélectionner la saison ;
2. ouvrir les demandes de licences club ;
3. ouvrir les licences individuelles ;
4. ouvrir les engagements compétitions ;
5. définir les fenêtres de transfert ;
6. lancer les contrôles financiers ;
7. renouveler les homologations nécessaires ;
8. expirer automatiquement les licences précédentes lorsque prévu.

Créer éventuellement :

`season_regulatory_cycles`

```text
id
seasonId
federationId
status
clubLicensingOpenAt
clubLicensingCloseAt
registrationOpenAt
registrationCloseAt
createdAt
updatedAt
```

---

# 16. P1-001 — Contrôle financier réglementaire

Créer `club_financial_compliance`.

```text
id
clubId
seasonId
status
budgetForecast
payrollForecast
playerDebts
staffDebts
taxDebts
federationDebts
otherDebts
auditedAccountsUrl nullable
auditorName nullable
submittedAt
reviewedAt
reviewedBy
reviewComment
```

Statuts :

```text
DRAFT
SUBMITTED
UNDER_REVIEW
COMPLIANT
CONDITIONAL
NON_COMPLIANT
```

## UI federation-hub

Dashboard par club :

```text
Club
Budget
Masse salariale
Dettes
Conformité
Licence club
```

Ne pas implémenter un système comptable complet.

Ce module est réglementaire, pas une comptabilité générale.

---

# 17. P1-002 — Gouvernance et comité directeur

Créer :

`club_board_mandates`

```text
id
clubId
startsAt
endsAt
status
electionDocumentUrl nullable
federationValidatedAt nullable
```

`club_board_members`

```text
id
mandateId
personName
userId nullable
role
startsAt
endsAt nullable
appointmentDocumentUrl nullable
federationApproved
```

Rôles :

```text
PRESIDENT
VICE_PRESIDENT
GENERAL_SECRETARY
TREASURER
BOARD_MEMBER
OTHER
```

---

# 18. P1-003 — Homologation des stades

Réutiliser les stades existants.

Créer `stadium_inspections`.

```text
id
stadiumId
seasonId
inspectionDate
inspectorUserId
pitchStatus
lightingStatus
changingRoomsStatus
securityStatus
capacityStatus
medicalStatus
mediaStatus
varStatus nullable
observations
status
expiresAt
```

Statuts :

```text
PENDING
APPROVED
APPROVED_WITH_RESTRICTIONS
REJECTED
SUSPENDED
EXPIRED
```

Créer `stadium_restrictions`.

---

# 19. P1-004 — Qualifications des entraîneurs

Créer `coach_qualifications`.

```text
id
staffId
qualificationType
licenseNumber
issuedAt
expiresAt nullable
documentUrl
status
validatedBy
validatedAt
```

Types :

```text
CAF_PRO
CAF_A
CAF_B
CAF_C
NATIONAL
OTHER
```

Statuts :

```text
PENDING
VALID
EXPIRED
SUSPENDED
REVOKED
```

Les compétitions peuvent définir :

```text
minimumHeadCoachQualification
```

---

# 20. P1-005 — Aptitude médicale fédérale

Créer `medical_eligibilities`.

```text
id
playerId
seasonId
clubId
examinationDate
expiresAt
status
validatedByMedicalUserId
certificateReference nullable
createdAt
updatedAt
```

Statuts :

```text
PENDING
FIT
UNFIT
EXPIRED
SUSPENDED
```

Ne jamais stocker le diagnostic ici.

Les détails médicaux restent dans `medical-hub`.

---

# 21. P1-006 — Agents et intermédiaires

Créer `football_agents`.

```text
id
userId nullable
fullName
fifaLicenseNumber
federationRegistrationNumber nullable
status
validFrom
validUntil nullable
contactEmail
contactPhone nullable
```

Créer `representation_agreements`.

```text
id
agentId
playerId nullable
clubId nullable
startDate
endDate
documentUrl
status
```

Créer éventuellement `transfer_intermediaries`.

Intégrer les agents dans les transferts et contrats.

---

# 22. P1-007 — Discipline fédérale

Ne pas remplacer les cartons/suspensions existants.

Créer un niveau supérieur :

`disciplinary_cases`

```text
id
caseNumber
matchId nullable
clubId nullable
personType nullable
personId nullable
offenseType
description
status
openedAt
hearingDate nullable
decisionDate nullable
createdBy
```

Créer :

- preuves ;
- audiences ;
- décisions ;
- sanctions ;
- appels.

Statuts :

```text
OPEN
UNDER_REVIEW
HEARING_SCHEDULED
DECIDED
APPEALED
CLOSED
```

---

# 23. P1-008 — Appels

Créer `appeals`.

```text
id
sourceType
sourceId
applicantType
applicantId
grounds
submittedAt
status
decisionAt nullable
decisionSummary nullable
```

Statuts :

```text
SUBMITTED
ADMISSIBILITY_REVIEW
UNDER_REVIEW
HEARING
DECIDED
REJECTED
WITHDRAWN
```

Un appel ne doit jamais modifier l'historique de la décision originale.

---

# 24. P2 — Domaines complémentaires

Préparer l'architecture sans nécessairement tout implémenter immédiatement.

## Assurances

```text
club_insurance_policies
person_insurance_policies
```

## Subventions

```text
federation_grants
grant_applications
grant_payments
```

## Droits TV

```text
broadcasting_revenue_distributions
```

## Indemnités de formation

```text
training_compensation_cases
```

## Solidarité transferts

```text
solidarity_contributions
```

---

# 25. Rôles et permissions

Étendre le RBAC avec des permissions fines.

Exemples federation-hub :

```text
club_license.view
club_license.review
club_license.approve
club_license.reject

person_license.view
person_license.review
person_license.approve
person_license.suspend

contract.view
contract.review
contract.approve

competition_registration.view
competition_registration.review
competition_registration.approve

transfer_window.manage

eligibility.view
eligibility.override

legal_case.view
legal_case.manage
legal_case.decide

discipline.view
discipline.manage
discipline.decide

appeal.view
appeal.manage
appeal.decide

financial_compliance.view
financial_compliance.review

stadium_license.view
stadium_license.review

agent.view
agent.manage
```

## Scope

Toujours respecter :

```text
PLATFORM_SUPERADMIN
  → global

FEDERATION_ADMIN
  → uniquement sa fédération

LEAGUE_ADMIN
  → uniquement sa ligue

CLUB ADMIN
  → uniquement son club
```

Les contrôles doivent être serveur-side.

---

# 26. API recommandée

Ne pas exposer directement les mutations réglementaires au navigateur sans garde serveur.

Exemples federation-hub :

```text
GET    /api/admin/club-licensing
POST   /api/admin/club-licensing
GET    /api/admin/club-licensing/:id
PATCH  /api/admin/club-licensing/:id
POST   /api/admin/club-licensing/:id/start-review
POST   /api/admin/club-licensing/:id/request-changes
POST   /api/admin/club-licensing/:id/approve
POST   /api/admin/club-licensing/:id/reject
POST   /api/admin/club-licensing/:id/suspend
```

Même principe pour :

```text
/api/admin/licenses
/api/admin/contracts
/api/admin/registrations
/api/admin/competition-entries
/api/admin/transfer-windows
/api/admin/legal-cases
/api/admin/sanctions
/api/admin/discipline
/api/admin/appeals
/api/admin/financial-compliance
/api/admin/stadium-licensing
/api/admin/coach-licenses
/api/admin/agents
```

Endpoints club-hub :

```text
/api/admin/federation/*
```

Ces endpoints servent uniquement au club connecté.

---

# 27. Notifications

Toutes les transitions réglementaires significatives doivent émettre un événement vers `notifications`.

Événements minimum :

```text
CLUB_LICENSE_SUBMITTED
CLUB_LICENSE_CHANGES_REQUESTED
CLUB_LICENSE_APPROVED
CLUB_LICENSE_REJECTED

PERSON_LICENSE_SUBMITTED
PERSON_LICENSE_APPROVED
PERSON_LICENSE_REJECTED
PERSON_LICENSE_EXPIRING

CONTRACT_SUBMITTED
CONTRACT_APPROVED
CONTRACT_REJECTED

COMPETITION_ENTRY_SUBMITTED
COMPETITION_ENTRY_APPROVED
COMPETITION_ENTRY_REJECTED

TRANSFER_WINDOW_OPENED
TRANSFER_WINDOW_CLOSING

PLAYER_REGISTRATION_APPROVED
PLAYER_REGISTRATION_REJECTED

CLUB_SANCTION_CREATED
CLUB_SANCTION_LIFTED

LEGAL_CASE_CREATED
LEGAL_CASE_HEARING_SCHEDULED
LEGAL_CASE_DECIDED

DISCIPLINARY_CASE_OPENED
DISCIPLINARY_DECISION_ISSUED

APPEAL_SUBMITTED
APPEAL_DECIDED
```

Prévoir FR/AR dans les templates.

---

# 28. Audit

Toutes les actions suivantes doivent être auditées :

- validation ;
- rejet ;
- suspension ;
- réactivation ;
- override ;
- changement de document ;
- changement de date ;
- ajout/suppression d'une sanction ;
- modification d'un contrat homologué ;
- décision juridique ;
- décision disciplinaire ;
- levée d'une interdiction.

L'audit doit permettre de reconstruire l'historique.

---

# 29. Documents et stockage

La plateforme utilise encore plusieurs uploads locaux.

Pour les nouveaux workflows réglementaires :

- encapsuler l'accès aux fichiers derrière une abstraction ;
- conserver l'URL + checksum + type + taille + version ;
- interdire l'écrasement silencieux d'un document déjà soumis ;
- conserver les anciennes versions ;
- limiter les formats ;
- prévoir antivirus / object storage comme évolution future.

Créer si utile un modèle générique :

`regulatory_documents`

```text
id
domain
entityId
documentType
fileUrl
fileName
mimeType
size
checksum
version
status
uploadedBy
uploadedAt
reviewedBy nullable
reviewedAt nullable
```

---

# 30. Contraintes d'intégrité

Les migrations SQL doivent ajouter :

- clés étrangères ;
- index ;
- contraintes d'unicité ;
- timestamps ;
- soft-delete uniquement lorsque nécessaire ;
- jamais de suppression physique d'une décision validée.

Exemples d'unicité :

```text
club + season → une demande de licence principale
player + competition + season + club → une inscription active
licenseNumber → unique parmi licences actives
caseNumber → unique
```

---

# 31. Sécurité

Obligatoire :

- aucune confiance dans `clubId`, `teamId`, `userId` envoyés par le frontend ;
- dériver le contexte depuis la session ;
- scopes fédération/ligue calculés côté serveur ;
- toutes les mutations avec contrôle de permission ;
- protection CSRF pour les mutations navigateur lorsque nécessaire ;
- rate limiting pour endpoints sensibles ;
- aucune clé de service dans le frontend ;
- pas de secret SSO dans le navigateur ;
- données médicales détaillées isolées.

---

# 32. Cohérence avec les applications existantes

## `match-operations`

Doit consommer l'éligibilité réglementaire avant validation d'une composition officielle.

## `club-hub`

Doit afficher l'état réglementaire du club sans dupliquer la logique de validation.

## `player-hub`

Peut afficher :

- numéro de licence ;
- statut licence ;
- statut d'enregistrement ;
- éligibilité.

Le joueur ne peut pas valider sa propre licence.

## `staff-hub`

Peut afficher les qualifications et l'éligibilité du staff.

## `medical-hub`

Reste propriétaire du médical détaillé.

## `identity`

Reste propriétaire des comptes.

## `payments`

À utiliser pour :

- droits d'engagement ;
- éventuellement frais de licence ;
- amendes lorsque le paiement électronique est souhaité.

## `notifications`

Source unique pour notifications réglementaires.

---

# 33. UX recommandée — Federation Hub

Ajouter une section principale :

```text
Clubs
├── Dossiers clubs
├── Licences clubs
├── Licences personnes
├── Contrats
├── Inscriptions joueurs
├── Engagements
├── Transferts
├── Éligibilité
├── Sanctions
├── Litiges
├── Discipline
├── Appels
├── Finances
├── Stades
└── Agents
```

Dashboard :

```text
Dossiers en attente
Licences expirant bientôt
Contrats à homologuer
Engagements en attente
Joueurs inéligibles
Clubs sous sanction
Litiges ouverts
Audiences prochaines
Dossiers financiers non conformes
```

---

# 34. UX recommandée — Club Hub

Ajouter :

```text
Fédération
├── Mon dossier
├── Licence du club
├── Licences
├── Contrats
├── Inscriptions joueurs
├── Engagements
├── Transferts
├── Conformité
├── Sanctions
└── Litiges
```

Le club doit toujours voir :

- statut ;
- prochaine action ;
- date limite ;
- blocages ;
- historique ;
- documents demandés.

---

# 35. Migration technique

## Phase 1

Créer les tables et modèles P0 sans casser les entités existantes.

## Phase 2

Implémenter services métier et gardes.

## Phase 3

Implémenter API federation-hub.

## Phase 4

Implémenter UI federation-hub.

## Phase 5

Implémenter UI club-hub.

## Phase 6

Brancher notifications.

## Phase 7

Brancher `EligibilityService` dans `match-operations`.

## Phase 8

Ajouter tests d'intégration et tests de permissions.

## Phase 9

Backfill des données existantes.

## Phase 10

Activer progressivement les règles bloquantes.

---

# 36. Backfill

Ne jamais rendre immédiatement tous les anciens joueurs inéligibles.

Prévoir un mode de transition.

Exemple :

```text
LEGACY_CONFIRMED
```

ou un backfill :

- licences historiques ;
- contrats historiques ;
- inscriptions de saison ;
- anciens transferts ;
- sanctions existantes.

Toutes les données historiques doivent garder leur provenance :

```text
source = LEGACY_BACKFILL
```

---

# 37. Tests minimum

Chaque workflow P0 doit avoir :

## Tests unitaires

- transitions autorisées ;
- transitions interdites ;
- règles d'éligibilité ;
- sanctions ;
- fenêtres de transfert.

## Tests intégration

- club A ne voit pas club B ;
- league admin ne voit pas autre ligue ;
- federation admin ne voit pas autre fédération ;
- superadmin voit tout ;
- joueur suspendu est inéligible ;
- licence expirée est bloquante ;
- transfert hors fenêtre est refusé ;
- interdiction de recrutement bloque le transfert ;
- contrat non homologué bloque l'enregistrement lorsque requis ;
- match-operations refuse un joueur inéligible.

## Tests concurrence

- double approbation ;
- double soumission ;
- double homologation ;
- deux sanctions simultanées ;
- transfert concurrent.

---

# 38. Critères de qualité

Avant de considérer la migration terminée :

- lint vert ;
- typecheck vert ;
- tests verts ;
- aucune migration destructive non documentée ;
- aucune régression SSO ;
- aucun accès cross-club ;
- aucun accès cross-league ;
- audit complet ;
- notifications idempotentes ;
- UI FR/AR ;
- support RTL ;
- responsive ;
- design system cohérent avec les applications existantes.

---

# 39. Hors périmètre immédiat

Ne pas profiter de cette migration pour :

- réécrire toute la base ;
- migrer toutes les applications vers une architecture microservices ;
- remplacer totalement MariaDB ;
- réécrire `club-hub` ;
- refondre ArbiNote ;
- changer les providers de paiement ;
- refaire le marketplace ;
- refaire le design system.

Le but est uniquement d'ajouter la **couche réglementaire fédérale manquante**.

---

# 40. Ordre d'implémentation recommandé

## Lot 1

```text
Club licensing
Licences individuelles
Contrats
```

## Lot 2

```text
Engagements compétitions
Enregistrements joueurs
Éligibilité
```

## Lot 3

```text
Fenêtres de transfert
Sanctions
Interdictions de recrutement
```

## Lot 4

```text
Litiges
Discipline fédérale
Appels
```

## Lot 5

```text
Contrôle financier
Stades
Qualifications entraîneurs
Médical fédéral
Agents
```

---

# 41. Sources réglementaires publiques utilisées pour cadrer le besoin

Les fonctionnalités proposées sont inspirées du fonctionnement administratif documenté publiquement par la Fédération Tunisienne de Football et des processus fédéraux/CAF associés.

Sources de référence :

- Fédération Tunisienne de Football : https://www.ftf.org.tn/fr/
- Commissions fédérales : https://www.ftf.org.tn/fr/commissions-federales/
- Téléchargements et documents : https://www.ftf.org.tn/fr/telechargements/
- Procédure CAF/FTF d'octroi des licences aux clubs : https://www.ftf.org.tn/fr/caf-ftf-seminaire-national-sur-la-procedure-doctroi-des-licences-au-clubs/
- Intermédiaires / agents : https://www.ftf.org.tn/fr/intermediaires/
- Discipline : https://www.ftf.org.tn/fr/category/discipline/
- Commissions juridiques / appel : https://www.ftf.org.tn/fr/commissions-juridique/

Ces sources servent de cadrage fonctionnel. Les règles exactes applicables à une saison donnée doivent rester configurables, car les règlements, périodes, catégories, montants, conditions de licence et niveaux de qualification peuvent évoluer.

---

# 42. Instruction finale pour l'agent IA

L'agent doit :

1. analyser l'existant avant toute modification ;
2. réutiliser les modèles et services existants lorsqu'ils couvrent déjà une responsabilité ;
3. respecter le design system de chaque projet ;
4. ne jamais déplacer une responsabilité vers la mauvaise application ;
5. implémenter les workflows P0 avant P1/P2 ;
6. ajouter les migrations SQL nécessaires ;
7. ajouter les tests ;
8. documenter chaque nouveau domaine ;
9. préserver la compatibilité avec les données existantes ;
10. ne jamais considérer une validation frontend comme une protection ;
11. vérifier tous les scopes côté serveur ;
12. utiliser `notifications` pour les événements ;
13. utiliser `payments` lorsque des frais réglementaires sont réellement encaissés ;
14. intégrer l'éligibilité avec `match-operations` ;
15. ne jamais exposer le diagnostic médical fédéralement ;
16. conserver un audit complet ;
17. mettre à jour les README des projets touchés ;
18. mettre à jour le manifeste des migrations ;
19. documenter tout backfill ;
20. terminer chaque lot avec lint, typecheck, tests et build des projets touchés.

La migration n'est considérée terminée que lorsque les workflows réglementaires sont utilisables de bout en bout :

```text
club-hub
   ↓ dépôt
federation-hub
   ↓ examen
validation / rejet / correction
   ↓
notifications
   ↓
impact réglementaire réel
   ↓
match-operations / transferts / engagements
```

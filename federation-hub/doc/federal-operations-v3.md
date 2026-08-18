# Federal Operations V3

Ce lot complète les processus fédéraux qui restent hors transfert international / ITC / FIFA TMS.

## Domaines

- commissions fédérales : membres, séances, présence, quorum, délibération, décision, signature et notification ;
- extension du cycle réglementaire annuel : campagnes assurance, subventions et conformité documentaire, état de préparation et finalisation ;
- assurances club/personnes ;
- subventions et paiements référencés ;
- redistribution des droits média ;
- indemnités de formation ;
- mécanisme de solidarité ;
- exigences et versions documentaires ;
- sélections nationales / DTN : équipes, événements et convocations.

## Principes de sécurité

- scope serveur `PLATFORM_SUPERADMIN` / `FEDERATION_ADMIN` / `LEAGUE_ADMIN` ;
- permissions réglementaires fines ;
- audit avec utilisateur, rôle, IP, User-Agent, ancienne/nouvelle valeur et motif ;
- quorum recalculé depuis les présences et membres votants stockés ;
- aucune décision possible sans délibération et quorum ;
- décision immuable après signature ;
- montants média recalculés côté serveur ;
- les paiements conservent une référence externe, sans simuler un PSP ;
- les documents doivent utiliser HTTPS ou un chemin interne ;
- aucune intégration FIFA TMS/ITC n'est introduite dans ce lot.

## Migration

Appliquer `federation-hub/mysql/migration_add_federal_operations_v3.sql` via le manifeste global avant activation des routes V3.

## Regulatory Policy Center (FED-001 à FED-005, platform-governance-roadmap.md §N)

Un second lot ajoute un centre de politiques réglementaires hiérarchique au-dessus de ces domaines, sans changer leurs machines à états :

- **FED-001** : `federation-hub/src/lib/regulatoryPolicyCenter.ts` résout une politique effective (`RegulatoryPolicyValues`) par héritage `PLATFORM → FEDERATION → LEAGUE → SEASON` (une saison = une édition de compétition dans ce schéma) via le contrat partagé `@foot/domain-contracts/policy` (GOV-001) — chaque valeur effective expose sa provenance exacte (scope, version, defaut vs politique explicite). Écran d'administration : `/admin/regulatory-policy-center`. Table : `federal_regulatory_policies` (versionnée, motif obligatoire à chaque nouvelle version — GOV-005).
- **FED-002/FED-003** : `regulatory_document_requirements` couvre désormais les templates `CONTRACT` et `MEDICAL` en plus de `CLUB_LICENSE`/`COACH_LICENSE`/`INSURANCE`/`STADIUM`/`FINANCIAL_COMPLIANCE`/…, avec `signature_required` et `verification_method` configurables par exigence ; `regulatory_document_submissions` capture `signed_at`/`signed_by`. Une soumission ne peut être marquée `VALID` si l'exigence impose une signature absente (`assertSubmissionSatisfiesSignature`).
- **FED-004** : `delegatedOperations` (valeur de policy, scope LEAGUE) porte la liste fermée des opérations qu'une fédération délègue explicitement à une ligue (`DELEGATABLE_OPERATIONS`). Un `LEAGUE_ADMIN` reste bloqué par `assertOperationDelegated` sur toute opération sensible non déléguée (assurance, subventions, droits média, formation, solidarité, conformité documentaire, licence club, discipline, appel) ; `FEDERATION_ADMIN`/plateforme ne sont jamais restreints.
- **FED-005** : `commissionRequiredForDiscipline` / `commissionRequiredForAppeals` / `commissionRequiredForClubLicensing` (valeurs de policy) rendent une décision de commission signée et conforme au quorum obligatoire avant qu'un dossier disciplinaire, un appel ou une licence club ne puisse être décidé/approuvé — vérifié via `assertCommissionDecisionRequired` (recherche d'une ligne `federal_commission_decisions.signed_at IS NOT NULL` liée par `source_type`/`source_id`). Comportement historique préservé : par défaut (aucune policy), aucune commission n'est exigée.

Migration : `federation-hub/mysql/migration_add_regulatory_policy_center.sql`.

## Fermeture des cycles P1 (FED-006 à FED-011, platform-governance-roadmap.md §N)

Un troisième lot ferme les cycles métier restés partiels dans les domaines Federal Operations V3 et ajoute deux briques transverses (SLA, migration des permissions) :

- **FED-006 (assurances)** : `saisons.requires_insurance` (comme `requires_stadium_approval`/`requires_financial_compliance`) bloque l'approbation d'un engagement (`assertRealApprovalPrerequisites` dans `competitionRegistrations.ts`) sans police `club_insurance_policies` `ACTIVE`, non expirée, couvrant la saison. `federalProgramViews.listInsurancePolicies` réécrit à la volée une police `ACTIVE`/`SUSPENDED` dont `expires_at` est dépassé en `EXPIRED` (`withEffectiveExpiry`, réutilise `effectiveExpiringStatus`) — les statuts jamais entrés en vigueur (`DRAFT`/`SUBMITTED`/`UNDER_REVIEW`/`REJECTED`) ne sont jamais réécrits.
- **FED-007 (subventions)** : `assertGrantJustificatifsSatisfied` bloque `APPROVED`/`PARTIALLY_APPROVED` tant que chaque exigence documentaire obligatoire du domaine `GRANT` couvrant le périmètre de la campagne n'a pas de soumission `VALID` liée par `related_entity_type = 'GRANT_APPLICATION'` — réutilise le pipeline `regulatory_document_submissions` existant plutôt que d'inventer un second mécanisme de justificatifs.
- **FED-008 (droits média)** : `transitionBroadcastingAllocation` ferme le cycle `calcul → approbation → revue club → paid/disputed` — `broadcasting_revenue_allocations.status` pouvait déjà valoir `PAID`/`DISPUTED` en base mais rien ne l'écrivait avant ce lot. `APPROVED → DISPUTED` exige un motif ; `DISPUTED → APPROVED` seulement (pas de retour direct à `PAID`).
- **FED-009 (formation/solidarité)** : `settleTrainingCompensationBeneficiary`/`settleSolidarityAllocation` (fonction partagée `settleBeneficiary`, les deux tables ont un schéma identique) règlent un bénéficiaire/une allocation en `PAID`/`DISPUTED`. Le dossier parent agrège automatiquement le statut de ses bénéficiaires (`computeAggregateCaseStatus`) : une seule contestation suffit à repasser le dossier en litige, il ne redevient `PAID` que lorsque tous les bénéficiaires sont réellement payés.
- **FED-010 (SLA réglementaires)** : `regulatory_sla_policies` (délai d'alerte / délai de dépassement par domaine et par fédération, défauts documentés dans `DEFAULT_SLA_HOURS` tant que rien n'est configuré) et `getRegulatorySlaOverdueQueue` (`regulatorySla.ts`) calculent à la volée une file "en retard" sur 7 domaines (licences club, engagements, discipline, appels, assurances, subventions, conformité documentaire). Pas de moteur de rappels/escalade planifié (BullMQ) dans ce lot — ce socle générique reste `GOV-008`.
- **FED-011 (migration des permissions)** : `regulatory_permission_mode_settings` porte un mode global `LEGACY` (défaut, comportement historique inchangé) / `WARN` (évalue comme si la whitelist était déjà stricte mais n'empêche rien, journalise dans `regulatory_permission_warnings`) / `ENFORCE` (whitelist stricte réellement appliquée, y compris pour un compte sans aucune ligne configurée) — `evaluateRegulatoryPermission` (pure) et `hasRegulatoryPermission` dans `regulatoryPermissions.ts`. Administration : `/api/admin/regulatory-permissions/mode` (GET/PUT) et `/api/admin/regulatory-permissions/warnings` (GET), tous deux réservés à la plateforme.

Migrations : `federation-hub/mysql/migration_add_competition_insurance_requirement.sql`, `migration_add_regulatory_sla_policies.sql`, `migration_add_regulatory_permission_mode.sql`.

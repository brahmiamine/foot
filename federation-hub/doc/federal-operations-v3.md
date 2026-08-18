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

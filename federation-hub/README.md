# federation-hub

## Rôle du projet

Back-office plateforme des référentiels football, des comptes de clubs et de l'administration fédérale de l'arbitrage.

## Fonctionnalités publiques

Connexion via SSO et acceptation d'une invitation staff par jeton.

**Pages inventoriées :** `/admin/arbitres`, `/admin/audit`, `/admin/card-reasons`, `/admin/club/[teamId]`, `/admin/club`, `/admin/federations`, `/admin/journees`, `/admin/leagues`, `/admin/matches`, `/admin`, `/admin/saisons`, `/admin/teams`, `/invite/[token]`, `/login`, `/`

## Fonctionnalités administratives

Dashboard/statistiques; fédérations, ligues, saisons, journées, équipes et branding, matchs (annulation/réouverture, saga de compensation), arbitres/import CSV, motifs de carton, clubs/utilisateurs/invitations et audit.

### Licence et conformité des clubs (migration-v2 P0-001)

`/admin/club-licensing` fournit la file d'examen réglementaire scopée par
fédération ou ligue. Le workflow couvre le démarrage d'examen, la décision de
chaque exigence, les dérogations motivées, les demandes de correction,
l'approbation, le rejet et la suspension. Chaque transition conserve auteur,
rôle, IP, User-Agent, motif et valeurs avant/après.

### Domaine Arbitrage

- profils officiels des arbitres : fédération, ligue, catégorie, grade, statut et date de début ;
- observateurs SSO et affectations provenant de `match-operations` ;
- évaluations officielles privées (`DRAFT → SUBMITTED → VALIDATED|REJECTED`), avec transitions atomiques ;
- contrôle serveur du match, de l'arbitre désigné, de l'observateur affecté et des scopes ;
- calcul serveur de la note à partir de tous les critères privés actifs et de leurs poids (valeurs 1 à 5) ;
- analytics affichant séparément score officiel et score public ArbiNote ;
- administration ArbiNote : votes, modération, anomalies, alertes, signalements et critères publics.

`votes.note_globale` (public) et `referee_official_evaluations.note_officielle` (privé) ne sont jamais fusionnés.

## API

`/api/admin/arbitres/[id]`, `/api/admin/arbitres/import`, `/api/admin/arbitres`, `/api/admin/audit`, `/api/admin/card-reasons/[id]`, `/api/admin/card-reasons`, `/api/admin/club/[teamId]/invitations`, `/api/admin/club/[teamId]`, `/api/admin/club`, `/api/admin/club/users/[id]`, `/api/admin/federations/[id]`, `/api/admin/federations/[id]/toggle`, `/api/admin/federations`, `/api/admin/journees/[id]`, `/api/admin/journees`, `/api/admin/leagues/[id]`, `/api/admin/leagues/[id]/toggle`, `/api/admin/leagues`, `/api/admin/logout`, `/api/admin/match-sagas`, `/api/admin/match-sagas/[id]/retry`, `/api/admin/match-sagas/[id]/steps`, `/api/admin/matches/[id]/cancel`, `/api/admin/matches/[id]/reopen`, `/api/admin/matches/[id]`, `/api/admin/matches`, `/api/admin/saisons/[id]`, `/api/admin/saisons`, `/api/admin/stats`, `/api/admin/teams/[id]/branding`, `/api/admin/teams/[id]`, `/api/admin/teams/import`, `/api/admin/teams`, `/api/health`, `/api/invite/[token]`

> Les routes dynamiques (`[id]`, `[matchId]`, etc.) attendent l'identifiant correspondant. Cet inventaire décrit le code présent, pas un contrat d'API versionné.

**Saga d'annulation de match (TASK-P0-003)** : `POST /api/admin/matches/[id]/cancel` bascule `matches.status -> CANCELLED` de façon inconditionnelle puis déclenche une saga de compensation (`src/lib/matchSaga.ts`) — appelle en HTTP `ticketing` (fermeture de vente + remboursement des billets déjà payés) et `club-hub` (annulation des convocations), chaque étape journalisée dans `match_saga_cases`/`match_saga_steps` (append-only). Un échec d'étape ne remet jamais en cause l'annulation elle-même (déjà actée) ; le dossier passe `MANUAL_REVIEW`, consultable via `GET /api/admin/match-sagas?status=MANUAL_REVIEW` et rejouable via `POST /api/admin/match-sagas/[id]/retry` (ne rejoue que les étapes en échec).

## Authentification et autorisations

Toutes les routes `/api/admin/*` exigent une session SSO. `PLATFORM_SUPERADMIN` a un accès global, `FEDERATION_ADMIN` et `LEAGUE_ADMIN` sont filtrés côté serveur, et `REFEREE_OBSERVER` n'accède qu'aux évaluations des matchs où il possède une affectation active. Les outils de modération ArbiNote restent réservés à la plateforme tant qu'aucune permission fine n'est persistée dans le SSO.

## Données possédées

Base partagée `foot`: référentiels, équipes/branding, matchs, arbitres, motifs, comptes/invitations staff et journal d'audit. Le domaine privé possède `referee_official_evaluations` et `official_referee_criteria`; les votes publics restent dans `votes`.

**Migrations réellement présentes :** Dump arbitres et migrations partagées (audit, votes, équipes, tournois); temps réels de match, invitations staff, branding et icônes, activation des fédérations/ligues, unicité des votes; `mysql/migration_add_match_saga.sql` (TASK-P0-003, `match_saga_cases`/`match_saga_steps`), `mysql/migration_extend_referee_profiles.sql` et `mysql/migration_add_official_referee_assessments.sql`. Migration-v2 P0-009 à P1-008 : `migration_add_club_sanctions.sql`, `migration_add_legal_cases.sql`, `migration_add_season_regulatory_cycles.sql`, `migration_add_financial_compliance.sql`, `migration_add_governance.sql`, `migration_add_stadium_inspections.sql`, `migration_add_coach_qualifications.sql`, `migration_add_medical_eligibilities.sql`, `migration_add_agents.sql`, `migration_add_disciplinary_cases.sql`, `migration_add_appeals.sql`.

## Intégrations

### Licences individuelles fédérales (migration-v2 P0-002)

`/admin/licenses` fournit la file d'examen des licences de joueurs, coachs,
staffs, personnels médicaux, dirigeants, arbitres et officiels. Les décisions
sont scopées par fédération/ligue, auditées et notifiées. Une approbation exige
un numéro unique ainsi que l'acceptation de toutes les pièces courantes.

### Inscriptions joueurs (migration-v2 P0-003)

`/admin/registrations` fournit la file d'examen des inscriptions de joueurs
par compétition-saison. Les administrateurs fédéraux et de ligue voient
uniquement leur périmètre, peuvent approuver, rejeter, suspendre, réactiver ou
annuler une inscription et disposent d'un historique complet. L'approbation
revérifie que la licence `PLAYER` liée est toujours active ; l'éligibilité et
les notifications club sont mises à jour avec la décision.

### Contrats joueurs (migration-v2 P0-004)

`/admin/contracts` fournit la file d'homologation des contrats, filtrée par
scope fédération/ligue, avec accès aux versions du document et à l'historique.
Le workflow couvre l'examen, l'approbation, le rejet motivé et l'annulation.
La page `/admin/saisons` permet de rendre le contrat homologué obligatoire pour
une compétition-saison ; toute annulation ou résiliation suspend alors les
inscriptions approuvées liées et retire leur éligibilité.

### Sanctions clubs (migration-v2 P0-009)

`/admin/sanctions` permet de créer, suspendre, réactiver et lever une sanction
club (interdiction de recrutement/inscription, exclusion, amende...), motivée
et auditée. `TRANSFER_BAN` bloque l'homologation de transfert (`club-hub`) et
`REGISTRATION_BAN` bloque l'approbation d'une inscription joueur.

### Litiges (migration-v2 P0-010)

`/admin/legal-cases` instruit les litiges (numéro de dossier unique, parties
polymorphes club/joueur/coach/staff/agent/fédération) : recevabilité,
instruction, audiences, décision, appel ou clôture. `club-hub` consulte les
dossiers où le club est partie et y dépose pièces/réponse.

### Renouvellement saisonnier (migration-v2 P0-011)

`/admin/season-cycles` pilote l'assistant d'ouverture de saison : un cycle par
saison, fenêtres de licence club et d'inscription joueurs par dates, clôture
avec expiration automatique des licences de la saison précédente. Sert de
garde serveur à la soumission des licences club et inscriptions côté
`club-hub`.

### Conformité financière (migration-v2 P1-001)

`/admin/financial-compliance` examine les dossiers financiers déposés par les
clubs (budget, masse salariale, dettes par catégorie) et statue
`COMPLIANT`/`CONDITIONAL`/`NON_COMPLIANT`. Pas un système comptable complet.

### Gouvernance et comité directeur (migration-v2 P1-002)

`/admin/board-mandates` valide ou rejette un mandat de comité directeur
déposé par un club et approuve individuellement tout membre ajouté en cours
de mandat (la validation du mandat approuve ses membres courants en bloc).

### Homologation des stades (migration-v2 P1-003)

`/admin/stadium-licensing` gère l'inspection fédérale des stades (`cms_stadiums`
en lecture seule) : sept aspects notés, décision homologuée/sous
réserve/rejetée/suspendue, réserves versionnées.

### Qualifications entraîneurs (migration-v2 P1-004)

`/admin/coach-licenses` valide les diplômes techniques CAF déposés par les
clubs pour leur staff, distinct des licences administratives saisonnières
(P0-002).

### Aptitude médicale fédérale (migration-v2 P1-005)

`/admin/medical-eligibility` décide `FIT`/`UNFIT` à partir du certificat déposé
par le club — aucun diagnostic n'est jamais représenté ni affiché.

### Agents et intermédiaires (migration-v2 P1-006)

`/admin/agents` tient le registre fédéral des agents et de leurs mandats de
représentation. Un `agentId` de contrat joueur (P0-004) doit désormais
référencer un agent `ACTIVE` non expiré (contrôle serveur côté `club-hub`).

### Discipline fédérale avancée (migration-v2 P1-007)

`/admin/discipline` instruit les dossiers disciplinaires (preuves, audiences,
décisions) sans remplacer `Card`/`Suspension` existants ; une décision peut
créer directement une sanction club liée (P0-009).

### Appels (migration-v2 P1-008)

`/admin/appeals` instruit les appels déposés contre une décision fédérale
(référence polymorphe). Un appel ne modifie jamais l'historique de la
décision contestée ; il transitionne seulement son statut vers `APPEALED`
quand ce domaine le prévoit.

SSO; SMTP pour invitations; notifications; MariaDB partagée par les applications métier; match-operations (réouverture de feuille, HTTP authentifié) ; ticketing et club-hub (saga d'annulation de match, TASK-P0-003 — `TICKETING_URL`/`CLUB_HUB_URL` + clés de service).

## Variables d’environnement

Copier le fichier réellement versionné :

```bash
cp .env.example .env.local
```

Variables déclarées dans `.env.example` : `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_LOGGING`, `SSO_URL`, `NEXT_PUBLIC_SSO_URL`, `SSO_JWT_SECRET`, `SSO_COOKIE_NAME`, `SSO_COOKIE_DOMAIN`, `NOTIFICATION_API_URL`, `NOTIFICATION_API_KEY`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`. Pour les API NestJS, utiliser `.env` si le chargeur de configuration de l'environnement ne lit pas `.env.local`. Ne jamais committer de valeurs réelles.

## Démarrage

Prérequis : Node.js, pnpm, et les dépendances MariaDB/Redis éventuelles configurées.

```bash
pnpm install
pnpm dev
pnpm build
pnpm start
pnpm lint
```

**Port :** 3002 via `PORT=3002` dans `../start.sh`; sinon défaut Next 3000.

Le script racine `../start.sh` ne lance que `identity`, `arbinote`, `match-operations`, `federation-hub` et `club-hub`, avec MariaDB partagée. Les autres projets se lancent séparément. `payments` et `notifications` possèdent leur base; `marketplace` vise également une base dédiée, tandis que les applications Next métier partagent encore `foot` (seller-portal inclus).

## Tests

`pnpm test`, `pnpm test:i18n`. Les scripts `lint` des API NestJS utilisent `--fix` et peuvent donc modifier les fichiers.

## Limites connues

Import CSV et uploads exigent validation/sauvegarde opérationnelle. Le secret SSO symétrique est partagé. Les migrations sont des scripts SQL manuels, sans runner/versionnement central.

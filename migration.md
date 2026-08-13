# Foot — Évolution vers un modèle Fédération / Ligue / Club

## 0. Suivi de migration

**Statut :** `[ ]` à faire · `[~]` partiel · `[x]` terminé

Ce document sert de source de vérité pour le suivi de ce chantier. Chaque phase est traitée par étapes successives, commit + push sur la branche `claude/migration-markdown-setup-rrb5ht`, avec mise à jour de cette section après chaque étape validée (build/tests passants sur les projets touchés).

| Phase | Contenu | Statut |
|---|---|---|
| Phase 1 | Modèle d'autorisation (rôles `PLATFORM_SUPERADMIN` / `FEDERATION_ADMIN` / `LEAGUE_ADMIN`, scopes, guards) | `[ ]` |
| Phase 2 | Affiliations historiques club ↔ fédération/ligue/saison | `[ ]` |
| Phase 3 | Joueurs & transferts (`player_transfers`, workflow, transaction) | `[ ]` |
| Phase 4 | Officiels de match (`match_official_assignments`, contrôle serveur `matchsheet`) | `[ ]` |
| Phase 5 | ArbiNote officiel (évaluation fédérale séparée du score public) | `[ ]` |

Détail des sous-tâches par phase, mis à jour au fil de l'implémentation :

### Phase 1 — Modèle d'autorisation
- [ ] Inspecter les rôles/guards/middlewares existants (`sso`, `superadmin`, autres consommateurs)
- [ ] Introduire `PLATFORM_SUPERADMIN`, `FEDERATION_ADMIN`, `LEAGUE_ADMIN` en conservant la compatibilité avec `SUPERADMIN`/`ADMIN`/`OBSERVATEUR`/`MEMBER`
- [ ] Définir les scopes serveur (`platform`, `federationId`, `leagueId`, `teamId`, `matchId`)
- [ ] Ajouter les guards serveur correspondants
- [ ] Tests négatifs (admin fédération A ne peut pas modifier fédération B, etc.)

### Phase 2 — Affiliations
- [ ] Modèle `team_affiliations` (federationId, leagueId, competitionId, seasonId, teamId, status, startDate, endDate)
- [ ] Migration DB versionnée
- [ ] Adapter les écrans `superadmin`
- [ ] Tests promotion / relégation / changement de ligue

### Phase 3 — Joueurs & transferts
- [ ] Vue globale joueurs dans `superadmin`
- [ ] Table `player_transfers`
- [ ] Workflow + transaction atomique (affiliation historique + `Player.teamId`)
- [ ] Vérification temporelle dans `matchsheet` (appartenance au moment du match)
- [ ] Audit + notifications

### Phase 4 — Officiels de match
- [ ] Table `match_official_assignments`
- [ ] Contrôle serveur des mutations sensibles dans `matchsheet`
- [ ] Audit nominatif

### Phase 5 — ArbiNote officiel
- [ ] Évaluation fédérale séparée (réservée `REFEREE_OBSERVER` / `FEDERATION_ADMIN`)
- [ ] Historique par arbitre

---

## 1. Mission

Analyser le monorepo `foot` existant et faire évoluer l’architecture vers un modèle fédéral propre, multi-clubs et extensible à plusieurs fédérations, **sans réécrire inutilement les modules déjà fonctionnels**.

Le but est de clarifier les responsabilités entre :

- la plateforme globale ;
- les fédérations ;
- les ligues ;
- les clubs ;
- les officiels de match ;
- les supporters ;
- les vendeurs.

L’implémentation doit préserver les fonctionnalités existantes et respecter le code réel du dépôt.

---

## 2. Règle fondamentale

Ne pas considérer durablement :

```text
SUPERADMIN = Fédération
```

La cible doit être :

```text
PLATFORM_SUPERADMIN
        │
        ├── Fédération A
        │      └── FEDERATION_ADMIN
        │
        ├── Fédération B
        │      └── FEDERATION_ADMIN
        │
        └── ...
```

Même si la plateforme ne gère qu’une seule fédération aujourd’hui, conserver cette séparation conceptuelle afin d’éviter une refonte future.

---

## 3. Architecture fonctionnelle cible

```text
PLATEFORME FOOT
│
├── PLATFORM_SUPERADMIN
│
├── Fédération
│   └── FEDERATION_ADMIN
│
├── Ligue
│   └── LEAGUE_ADMIN
│
├── Clubs
│   ├── CLUB_ADMIN
│   └── CLUB_STAFF
│
├── Officiels
│   ├── REFEREE
│   ├── MATCH_OFFICIAL
│   └── REFEREE_OBSERVER
│
├── Supporters
│   └── MEMBER
│
└── Commerce
    └── SELLER
```

Les permissions doivent être contrôlées côté serveur selon un **scope explicite** :

```text
platform
federationId
leagueId
teamId
matchId
```

Ne jamais faire confiance à un identifiant de scope envoyé uniquement par le frontend.

---

## 4. Classification des projets

### Plateforme globale

- `superadmin`
- `sso`
- `payment-api`
- `notification-api`
- `marketplace-api`

### Fédération / compétition

- `arbinote`
- `matchsheet`

### Clubs

- `teamManager`
- `billetterie`

### Vendeurs

- `sellerPortal`

### Application custom

- `ob` — uniquement Olympique de Béja

---

## 5. État actuel important à respecter

### 5.1 `matchsheet` est déjà authentifié

Ne pas réimplémenter inutilement son authentification.

Le projet possède déjà :

- middleware SSO ;
- vérification du JWT ;
- contrôle de révocation ;
- `teamId` obligatoire ;
- accès club `ADMIN` / `OBSERVATEUR` ;
- refus de `SUPERADMIN` ;
- routes internes protégées par authentification service-à-service.

Le besoin restant n’est donc pas « ajouter une authentification basique », mais **introduire une identité officielle de match plus précise** :

```text
MATCH_OFFICIAL
REFEREE
REFEREE_OBSERVER
```

et vérifier qu’un utilisateur est réellement affecté au match concerné.

### 5.2 `superadmin` est actuellement global

Le middleware actuel protège les routes avec le rôle :

```text
SUPERADMIN
```

Il n’existe pas encore de scope fédéral strict.

Le rôle actuel doit donc être interprété comme :

```text
PLATFORM_SUPERADMIN
```

La compatibilité avec `SUPERADMIN` peut être conservée temporairement pendant la migration.

### 5.3 Relation Federation → League existante

Le modèle contient déjà une relation de type :

```text
Federation
   ↓
League
```

avec un `federation_id`.

Ne pas recréer ce lien.

### 5.4 Les clubs ne sont pas encore correctement scopés par fédération / saison

L’entité `Team` ne porte pas actuellement un modèle complet de rattachement historique à une fédération, une ligue, une compétition et une saison.

Ne pas ajouter naïvement un simple :

```text
team.leagueId
```

comme unique vérité historique.

Un club peut changer de ligue selon la saison.

---

## 6. Nouveau modèle d’affiliation

Créer un modèle d’affiliation historique permettant de représenter :

```text
Club
 └── Affiliation
      ├── federationId
      ├── leagueId
      ├── competitionId
      ├── seasonId
      ├── teamId
      ├── status
      ├── startDate
      └── endDate
```

Nom possible :

```text
team_affiliations
```

ou un nom cohérent avec le schéma existant.

### Contraintes

- `teamId` obligatoire ;
- `federationId` obligatoire ;
- `leagueId` nullable si nécessaire ;
- `competitionId` nullable si nécessaire ;
- `seasonId` obligatoire lorsqu’on représente une participation saisonnière ;
- ne pas écraser l’historique ;
- permettre promotion / relégation ;
- permettre changement de ligue ;
- permettre désaffiliation ;
- prévoir statut `ACTIVE`, `ENDED`, `SUSPENDED` si pertinent.

---

## 7. Évolution des rôles SSO

Faire évoluer progressivement les rôles existants.

### Rôles cibles

```text
PLATFORM_SUPERADMIN
FEDERATION_ADMIN
LEAGUE_ADMIN

CLUB_ADMIN
CLUB_STAFF

REFEREE
MATCH_OFFICIAL
REFEREE_OBSERVER

MEMBER
SELLER
```

### Compatibilité

Ne pas casser immédiatement :

```text
SUPERADMIN
ADMIN
OBSERVATEUR
MEMBER
```

Créer une stratégie de migration compatible.

Par exemple :

```text
SUPERADMIN → PLATFORM_SUPERADMIN
ADMIN → CLUB_ADMIN
OBSERVATEUR → CLUB_STAFF ou rôle plus précis selon contexte
```

Ne pas faire de migration destructrice sans vérifier tous les projets consommateurs.

---

## 8. Scopes d’autorisation

Le contexte utilisateur doit pouvoir représenter :

```json
{
  "userId": "...",
  "role": "FEDERATION_ADMIN",
  "federationId": "...",
  "leagueIds": [],
  "teamId": null
}
```

ou :

```json
{
  "userId": "...",
  "role": "LEAGUE_ADMIN",
  "federationId": "...",
  "leagueIds": ["..."],
  "teamId": null
}
```

ou :

```json
{
  "userId": "...",
  "role": "CLUB_ADMIN",
  "federationId": "...",
  "teamId": "..."
}
```

Le JWT peut transporter des informations de contexte, mais les ressources demandées doivent toujours être vérifiées côté serveur.

Exemple :

```text
FEDERATION_ADMIN(federation=A)
```

ne doit jamais pouvoir modifier :

```text
League appartenant à Federation=B
```

---

## 9. `superadmin` — évolution attendue

Transformer progressivement `superadmin` en administration multi-niveaux.

### PLATFORM_SUPERADMIN

Peut :

- gérer les fédérations ;
- gérer la configuration plateforme ;
- gérer les administrateurs fédéraux ;
- consulter l’ensemble du système ;
- superviser sécurité, audit et infrastructure fonctionnelle.

### FEDERATION_ADMIN

Peut uniquement dans sa fédération :

- gérer les ligues ;
- gérer les compétitions ;
- gérer les saisons ;
- gérer les journées ;
- gérer les clubs affiliés ;
- gérer les arbitres ;
- gérer les règles fédérales ;
- superviser les matchs ;
- homologuer certaines opérations ;
- gérer les transferts/homologations si le module l’exige.

### LEAGUE_ADMIN

Peut uniquement dans sa ou ses ligues :

- gérer les journées ;
- gérer les matchs ;
- affecter les arbitres autorisés ;
- consulter les clubs de la ligue ;
- gérer les opérations autorisées de compétition.

### Tests indispensables

Ajouter des tests négatifs :

```text
FEDERATION_ADMIN A → impossible de modifier fédération B
LEAGUE_ADMIN X → impossible de modifier ligue Y
CLUB_ADMIN OB → impossible de modifier EST
```

---

## 10. `teamManager` — rôle inchangé : application club

`teamManager` doit rester une application générique multi-clubs.

Il appartient au niveau CLUB et continue à gérer :

- joueurs ;
- staff ;
- entraînements ;
- convocations ;
- tactiques ;
- blessures ;
- discipline interne ;
- déplacements ;
- actualités ;
- médias ;
- sponsors ;
- académie ;
- recrutement ;
- boutique ;
- configuration locale de billetterie ;
- branding club.

Ne pas transformer `teamManager` en back-office fédéral.

### Règle

```text
Fédération
    ↓ supervision
Club
    ↓
teamManager
```

et non :

```text
Fédération
    ↓
gestion quotidienne de tous les clubs
```

---

## 11. `matchsheet` — évolution officielle

Conserver l’authentification SSO existante.

Ajouter un modèle permettant de prouver qui est officiellement autorisé à intervenir sur un match.

Exemple :

```text
match_official_assignments
├── id
├── matchId
├── userId
├── refereeId
├── role
├── status
├── assignedBy
├── assignedAt
└── revokedAt
```

Rôles possibles :

```text
CENTER_REFEREE
ASSISTANT_REFEREE
FOURTH_OFFICIAL
MATCH_DELEGATE
REFEREE_OBSERVER
TEAM_REPRESENTATIVE
```

### Avant toute mutation sensible

Vérifier :

- utilisateur authentifié ;
- rôle autorisé ;
- affectation au match ;
- statut du match ;
- état de la feuille ;
- club/périmètre si applicable.

### Audit

Journaliser :

- auteur ;
- match ;
- action ;
- ancien état ;
- nouvel état ;
- date ;
- terminal/IP si disponible ;
- correction post-signature ;
- autorité ayant autorisé une correction.

---

## 12. `arbinote` — séparer public et officiel

Conserver la notation publique existante.

Ajouter éventuellement un deuxième domaine clairement séparé :

```text
Évaluation publique
≠
Évaluation fédérale officielle
```

### Public

- supporters ;
- score communautaire ;
- anti-fraude ;
- classement bayésien ;
- aucune conséquence réglementaire directe.

### Officiel

Réservé à :

```text
REFEREE_OBSERVER
FEDERATION_ADMIN
```

Possibilités :

- note officielle ;
- critères techniques ;
- rapport d’observation ;
- points forts/faibles ;
- recommandations ;
- validation finale ;
- historique par arbitre ;
- statistiques de performance ;
- aide aux promotions/désignations/formations.

Ne jamais fusionner automatiquement les deux scores.

---

## 13. Billetterie — gouvernance

La billetterie reste un service générique multi-clubs.

### Fédération

Peut définir :

- politiques globales ;
- règles de sécurité ;
- contraintes visiteurs ;
- restrictions par compétition ;
- règles réglementaires.

### Club organisateur

Gère :

- catégories ;
- capacité ;
- prix ;
- quotas ;
- fenêtres de vente ;
- audience ;
- ouverture/fermeture des ventes.

### Billetterie

Gère :

- réservation ;
- achat ;
- paiement ;
- émission ;
- QR ;
- contrôle ;
- scan ;
- statut billet.

Ne pas centraliser toutes les opérations quotidiennes dans le compte fédéral.

---

## 14. Marketplace

Conserver :

```text
sellerPortal
      ↓
marketplace-api
```

### Responsabilités

#### Seller

- catalogue ;
- stock ;
- commandes ;
- expéditions ;
- retours autorisés ;
- données de son périmètre.

#### Club

- validation de l’utilisation de sa marque ;
- modération des produits liés au club ;
- règles de commission club.

#### Fédération

Optionnellement :

- politiques globales ;
- catégories interdites ;
- règles de conformité sportive.

#### Plateforme

- sécurité ;
- litiges globaux ;
- paiements ;
- supervision ;
- conformité technique.

---

## 15. Paiement

`payment-api` reste un service mutualisé.

Ne pas déplacer sa logique métier dans `superadmin`.

Chaque transaction doit permettre d’identifier :

- application source ;
- fédération éventuelle ;
- club bénéficiaire ;
- utilisateur ;
- commande/billet ;
- montant ;
- frais plateforme ;
- reversement ;
- provider.

Conserver l’authentification service-à-service.

---

## 16. Notifications

`notification-api` reste transversal.

Les autres projets doivent publier des événements métier et ne pas recréer chacun leurs propres systèmes d’email/push.

Exemples :

```text
MATCH_ASSIGNED
MATCH_STARTED
MATCH_FINISHED
TRANSFER_COMPLETED
TICKET_PAID
TICKET_ISSUED
ORDER_CONFIRMED
REFEREE_EVALUATION_PUBLISHED
```

---

## 17. `ob`

`ob` reste une application **custom Olympique de Béja uniquement**.

Ne pas la rendre générique.

Elle peut consommer les données de la plateforme pour :

- actualités ;
- équipe ;
- matchs ;
- live ;
- billetterie ;
- boutique ;
- espace membre ;
- transferts publics ;
- annonces officielles.

Le branding OB peut rester spécifique dans ce projet.

---

## 18. Module joueurs global dans `superadmin`

Ajouter une vue globale des joueurs.

### Écrans

```text
/joueurs
```

Filtres :

- fédération ;
- ligue ;
- saison ;
- club ;
- catégorie ;
- poste ;
- statut ;
- recherche.

Ajouter également :

```text
/clubs/{clubId}/joueurs
```

La fédération peut consulter le référentiel complet selon son scope.

---

## 19. Module transferts

Créer un module central de transfert/homologation.

### Règle fondamentale

Ne jamais supprimer puis recréer un joueur lors d’un transfert.

Conserver :

```text
Player.id
```

pendant toute la carrière.

`Player.teamId` représente le club courant.

L’historique d’appartenance et les événements de transfert doivent être conservés séparément.

### Table suggérée

```text
player_transfers
├── id
├── playerId
├── fromTeamId
├── toTeamId
├── transferType
├── transferDate
├── effectiveDate
├── seasonId
├── status
├── fee
├── currency
├── loanStartDate
├── loanEndDate
├── notes
├── createdBy
├── approvedBy
├── createdAt
└── updatedAt
```

### Types

```text
PERMANENT
LOAN
LOAN_RETURN
FREE_TRANSFER
```

### Statuts

```text
DRAFT
PENDING
APPROVED
COMPLETED
CANCELLED
REJECTED
```

### Workflow cible

```text
Club vendeur
    ↓
demande
    ↓
Club acheteur
    ↓
validation
    ↓
Fédération / Ligue
    ↓
homologation
    ↓
transfert COMPLETED
    ↓
Player.teamId mis à jour
```

Le workflow peut être simplifié dans une première version si seuls les administrateurs fédéraux créent les transferts.

---

## 20. Historique d’appartenance joueur

Le dépôt possède déjà un concept `TeamMember` avec :

```text
teamId
playerId
status
startDate
endDate
```

Réutiliser cette logique lorsque possible.

Lors d’un transfert :

```text
ancienne affiliation
status = ENDED
endDate = effectiveDate
```

puis :

```text
nouvelle affiliation
status = ACTIVE
startDate = effectiveDate
```

et seulement ensuite :

```text
Player.teamId = toTeamId
```

Toutes ces opérations doivent être effectuées dans **une seule transaction DB**.

---

## 21. Historique sportif

Les données historiques doivent rester attachées au club correspondant au moment où elles ont été créées.

Ne jamais recalculer l’historique simplement à partir du `Player.teamId` courant.

Exemples concernés :

- statistiques ;
- compositions ;
- buts ;
- cartons ;
- blessures ;
- convocations ;
- feuilles de match.

Pour une donnée historique :

```text
club au moment de l’événement
```

doit être conservé.

---

## 22. Vérification temporelle dans `matchsheet`

Ne pas utiliser uniquement :

```text
player.teamId === match.teamId
```

pour vérifier historiquement l’appartenance.

Exemple :

```text
match : 10/08/2026
transfert : 16/08/2026
```

Le joueur doit rester considéré comme joueur de son ancien club pour le match du 10/08.

Utiliser l’historique d’affiliation :

```text
startDate <= matchDate
AND
(endDate IS NULL OR endDate >= matchDate)
```

---

## 23. Exploitation des transferts dans les autres projets

### `teamManager`

Ajouter :

```text
Effectif
├── Joueurs actuels
└── Anciens joueurs
```

Pour un ancien joueur :

- dates d’appartenance ;
- club de destination ;
- historique sportif en lecture seule.

Un ancien club ne doit pas modifier arbitrairement les données actuelles du joueur appartenant désormais à un autre club.

### `ob`

Possibilité d’ajouter une page :

```text
Mercato
├── Arrivées
└── Départs
```

Uniquement pour les transferts :

```text
COMPLETED
```

et explicitement publics.

### `notification-api`

Publier :

```text
PLAYER_TRANSFER_REQUESTED
PLAYER_TRANSFER_APPROVED
PLAYER_TRANSFER_REJECTED
PLAYER_TRANSFER_COMPLETED
```

### `superadmin`

Ajouter :

```text
Transferts
├── Nouveau
├── En attente
├── Approuvés
├── Historique
├── Prêts
└── Annulés
```

---

## 24. Matrice de responsabilité cible

| Domaine | Responsable principal |
|---|---|
| Fédérations | Platform SuperAdmin |
| Ligues | Federation Admin |
| Compétitions | Federation / League Admin |
| Saisons | Federation / League Admin |
| Journées | League Admin |
| Clubs affiliés | Federation Admin |
| Matchs officiels | Federation / League |
| Arbitres | Federation / League |
| Feuille officielle | Match Official |
| Joueurs club | Club |
| Transferts homologués | Federation / League |
| Entraînements | Club |
| Blessures internes | Club |
| Contenu club | Club |
| Billetterie commerciale | Club organisateur |
| Paiement | payment-api |
| Notifications | notification-api |
| Marketplace | marketplace-api |
| Vendeur | sellerPortal |
| Site OB | OB uniquement |

---

## 25. Contraintes d’implémentation

### Ne pas faire

- ne pas réécrire toutes les applications ;
- ne pas casser le SSO existant ;
- ne pas supprimer l’auth existante de `matchsheet` ;
- ne pas remplacer toutes les relations par de nouvelles tables sans migration ;
- ne pas mettre toute la logique fédérale dans `teamManager` ;
- ne pas transformer `ob` en application générique ;
- ne pas faire confiance au scope fourni par le navigateur ;
- ne pas supprimer l’historique joueur lors d’un transfert ;
- ne pas déplacer paiement/notifications dans `superadmin`.

### Faire

- analyser le code existant avant chaque modification ;
- préserver la compatibilité ;
- utiliser migrations SQL/TypeORM versionnées ;
- ajouter les nouveaux rôles progressivement ;
- ajouter tests de permissions négatifs ;
- ajouter audit sur actions sensibles ;
- utiliser transactions pour les transferts ;
- documenter les changements.

---

## 26. Ordre recommandé d’implémentation

### Phase 1 — modèle d’autorisation

1. introduire `PLATFORM_SUPERADMIN` conceptuellement ;
2. ajouter `FEDERATION_ADMIN` ;
3. ajouter `LEAGUE_ADMIN` ;
4. définir les scopes ;
5. ajouter les guards serveur correspondants ;
6. conserver la compatibilité avec les anciens rôles.

### Phase 2 — affiliations

1. créer le modèle historique d’affiliation ;
2. rattacher clubs / fédérations / ligues / saisons ;
3. adapter les écrans `superadmin` ;
4. ajouter tests promotion / relégation / changement de ligue.

### Phase 3 — joueurs et transferts

1. liste globale des joueurs dans `superadmin` ;
2. fiche joueur ;
3. historique clubs ;
4. table `player_transfers` ;
5. workflow transfert ;
6. transaction atomique ;
7. audit ;
8. notifications.

### Phase 4 — officiels

1. rôles `REFEREE`, `MATCH_OFFICIAL`, `REFEREE_OBSERVER` ;
2. affectations par match ;
3. contrôle serveur dans `matchsheet` ;
4. audit nominatif.

### Phase 5 — ArbiNote officiel

1. conserver notation publique ;
2. ajouter évaluations officielles séparées ;
3. permissions observateur ;
4. historique arbitre.

---

## 27. Tests obligatoires

### Autorisations

```text
PLATFORM_SUPERADMIN → toutes fédérations
FEDERATION_ADMIN A → uniquement A
LEAGUE_ADMIN X → uniquement X
CLUB_ADMIN OB → uniquement OB
MATCH_OFFICIAL → uniquement matchs affectés
```

### Transferts

Tester :

- transfert permanent ;
- prêt ;
- retour de prêt ;
- transfert même club interdit ;
- joueur inexistant ;
- club source incorrect ;
- club destination inexistant ;
- double validation concurrente ;
- rollback si une étape échoue ;
- conservation du `Player.id` ;
- conservation des anciennes stats ;
- nouvelle affiliation active ;
- ancienne affiliation clôturée.

### Historique temporel

Vérifier qu’un joueur transféré après un match reste correctement associé à son ancien club pour ce match.

### Multi-fédération

Créer au minimum :

```text
Federation A
Federation B
```

et vérifier qu’aucun administrateur de A ne peut accéder en écriture aux données de B.

---

## 28. Audit

Toutes les actions sensibles doivent produire un audit :

- création/modification fédération ;
- rattachement club ;
- promotion/relégation ;
- transfert joueur ;
- homologation ;
- affectation arbitre ;
- correction feuille de match ;
- modification post-signature ;
- changement de rôle.

Champs recommandés :

```text
actorUserId
actorRole
federationId
leagueId
teamId
matchId
entityType
entityId
action
before
after
createdAt
```

---

## 29. Résultat attendu

À la fin, la plateforme doit pouvoir représenter proprement :

```text
Platform
   │
   ├── Federation A
   │      ├── League 1
   │      │    ├── Club A
   │      │    └── Club B
   │      └── League 2
   │
   └── Federation B
          └── ...
```

avec :

- isolation stricte ;
- permissions par niveau ;
- clubs autonomes ;
- compétition fédérale ;
- officiels authentifiés ;
- historique fiable ;
- transferts homologués ;
- services techniques mutualisés ;
- applications club génériques ;
- `ob` conservé comme site custom OB.

---

## 30. Instruction finale à l’agent IA

Avant de coder :

1. inspecter les entités, guards, middleware, routes, services et migrations existants ;
2. identifier ce qui est déjà implémenté ;
3. ne pas dupliquer les mécanismes existants ;
4. proposer une migration compatible ;
5. implémenter par étapes ;
6. ajouter les migrations ;
7. ajouter les tests ;
8. exécuter lint, TypeScript, tests et build sur les projets touchés ;
9. corriger toutes les régressions introduites ;
10. fournir un bilan final précis des fichiers modifiés, migrations, nouvelles permissions, tests et éventuelles actions manuelles.

**Ne pas s’arrêter à une simple analyse : appliquer les changements nécessaires jusqu’à obtenir un modèle Fédération / Ligue / Club cohérent, sécurisé et rétrocompatible.**

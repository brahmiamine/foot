# Analyse des processus et éléments manquants

## Contexte

Cette analyse porte sur le dépôt `foot`, après l'ajout d'une application `sso` dédiée à l'authentification centralisée.

Ce document couvre l'infrastructure, la sécurité, la qualité et la gouvernance des données. Le backlog fonctionnel/produit (API-Football, notifications, PWA, espace supporter, boutique, sponsors, finance, RGPD) est traité séparément dans `roadmap.md`.

## Applications concernées

Le dépôt contient plusieurs applications :

- `arbinote` : site public de notation des arbitres, votes, critères, anomalies, alertes et messages.
- `matchsheet` : feuille de match électronique, avant-match, live, après-match, signatures et événements.
- `superadmin` : référentiels internes fédérations, ligues, saisons, journées, équipes, matchs, arbitres, journal d'audit, test API-Football et gestion des comptes clubs.
- `teamManager` : gestion club, effectif, actualités, discipline, cartons, suspensions, amendes, notes, audit, réglages, boutique, sponsors, médias et statistiques.
- `sso` : authentification centralisée et émission d'un cookie JWT partagé entre les apps.

---

# 1. Manques critiques d'infrastructure

## 1.1. `sso` n'est pas lancé par `start.sh`

### Constat

Le script racine lance actuellement :

- `arbinote` sur le port `3000` ;
- `matchsheet` sur le port `3001` ;
- `superadmin` sur le port `3002` ;
- `teamManager` sur le port `3003`.

Il ne lance pas l'application `sso`, alors que les autres apps dépendent du SSO pour l'authentification centralisée.

### Impact

En environnement local, l'utilisateur qui lance uniquement `./start.sh` n'a pas de service SSO disponible. Les redirections vers `SSO_URL` échouent si le SSO n'est pas démarré manuellement.

### Recommandation

Ajouter `sso` au script racine, par exemple sur le port `3004` :

```bash
# ── sso sur le port 3004 (authentification centralisée) ─────────────────────
echo "🚀 Lancement de sso sur http://localhost:3004 ..."
(cd "$ROOT_DIR/sso" && PORT=3004 pnpm run dev 2>&1 | sed -u 's/^/[sso]        /') &
```

### Priorité

Très haute.

---

## 1.2. Documentation des ports incomplète

### Constat

Le script local documente et lance les apps existantes, mais le SSO doit être intégré dans la documentation de lancement.

### Recommandation

Documenter une matrice locale claire :

| App | Port local |
|---|---:|
| `arbinote` | 3000 |
| `matchsheet` | 3001 |
| `superadmin` | 3002 |
| `teamManager` | 3003 |
| `sso` | 3004 |
| `phpMyAdmin` | 9090 |
| `MariaDB` | 3307 |

Ajouter aussi un exemple d'environnement local :

```env
SSO_URL=http://localhost:3004
SSO_COOKIE_DOMAIN=
SSO_COOKIE_NAME=foot_sso_session
SSO_JWT_SECRET=dev-secret-change-me
```

### Priorité

Très haute.

---

# 2. Manques autour du SSO

## 2.1. Dépendances `sso` non installées localement

### Constat

Le lint de `sso` échoue car `node_modules` est absent et ESLint n'est pas disponible localement.

### Impact

Impossible de valider proprement `sso` avec `pnpm run lint` tant que ses dépendances ne sont pas installées.

### Recommandation

```bash
cd sso
pnpm install
pnpm run lint
pnpm run build
```

### Priorité

Très haute.

---

## 2.2. Code de vérification SSO dupliqué

### Constat

Le SSO signe les sessions JWT, mais les apps clientes contiennent chacune leur copie de la logique de vérification du cookie/token.

### Impact

Si le format du token, le nom du cookie, l'issuer, les rôles ou la logique de validation changent, il faut modifier plusieurs copies. Cela augmente fortement le risque d'incohérences.

### Recommandation

Créer un package partagé interne, par exemple :

```text
packages/auth-shared/
  src/session.ts
  src/roles.ts
  src/cookies.ts
  src/redirect.ts
```

Puis importer ce package dans :

- `arbinote` ;
- `matchsheet` ;
- `superadmin` ;
- `teamManager` ;
- `sso`.

### Priorité

Très haute.

---

## 2.3. Validation stricte des rôles SSO

### Constat

La vérification JWT accepte le rôle du payload comme string puis le caste vers le type attendu.

### Risque

Un token signé contenant un rôle inattendu mais textuel peut être accepté dans certaines parties du système.

### Recommandation

Ajouter une validation stricte :

```ts
const SSO_ROLES = ["ADMIN", "OBSERVATEUR", "SUPERADMIN"] as const;

type SsoRole = (typeof SSO_ROLES)[number];

function isSsoRole(value: unknown): value is SsoRole {
  return typeof value === "string" && SSO_ROLES.includes(value as SsoRole);
}
```

Puis refuser tout token dont le rôle n'est pas reconnu.

### Priorité

Haute.

---

## 2.4. Révocation de sessions absente

### Constat

Le SSO émet un JWT stateless avec une durée de vie fixe. Le logout supprime le cookie côté navigateur, mais ne révoque pas le token côté serveur.

### Risque

Un token volé reste valide jusqu'à expiration.

### Recommandation

Ajouter un mécanisme de révocation :

- `sessionVersion` ou `tokenVersion` sur `User` ;
- inclusion de cette version dans le JWT ;
- vérification de la version pour les routes sensibles ;
- incrémentation lors de :
  - changement de mot de passe ;
  - désactivation du compte ;
  - logout global ;
  - suspicion de compromission.

### Priorité

Haute.

---

## 2.5. MFA absent pour les comptes `SUPERADMIN`

### Constat

L'authentification centralisée vérifie email, mot de passe, état actif et cohérence du club, mais pas de second facteur.

### Risque

Un compte `SUPERADMIN` compromis donne accès au référentiel central de la plateforme.

### Recommandation

Ajouter MFA pour `SUPERADMIN` :

- TOTP ;
- codes de récupération ;
- obligation d'activation au premier login ;
- audit des activations/désactivations MFA ;
- option de restriction IP pour les comptes sensibles.

### Priorité

Haute.

---

## 2.6. Mot de passe oublié absent

### Constat

Le projet `sso` expose seulement les routes de login, logout, liste des équipes et pages de connexion/racine. Il manque un workflow de réinitialisation de mot de passe.

### Recommandation

Ajouter :

```text
/forgot-password
/reset-password
/api/forgot-password
/api/reset-password
```

Avec une table ou entité :

```text
PasswordResetToken
  id
  userId
  tokenHash
  expiresAt
  usedAt
  createdAt
```

### Priorité

Haute.

---

## 2.7. Première connexion et invitation club absentes

### Constat

Les comptes clubs sont créés depuis `superadmin` avec un mot de passe fourni.

### Recommandation

Ajouter un vrai processus d'invitation :

1. création du compte club sans mot de passe définitif ;
2. envoi d'un email d'invitation ;
3. lien d'activation expirant ;
4. choix du mot de passe ;
5. acceptation des conditions ;
6. première configuration du club.

### Priorité

Haute.

---

## 2.8. Dashboard / portail SSO absent

### Constat

La page racine SSO affiche simplement que l'utilisateur est connecté et l'invite à revenir sur l'application souhaitée.

### Recommandation

Ajouter un portail SSO :

- accès `ArbiNote` ;
- accès `MatchSheet` ;
- accès `SuperAdmin` si rôle `SUPERADMIN` ;
- accès `TeamManager` si compte club ;
- profil utilisateur ;
- changement de mot de passe ;
- déconnexion.

### Priorité

Moyenne à haute.

---

## 2.9. Middleware global absent dans certaines apps

### Constat

`matchsheet` possède un middleware qui protège les routes de feuilles de match. Les autres apps s'appuient plutôt sur des helpers appelés dans les pages/routes.

### Risque

Une nouvelle route admin peut être oubliée et ne pas appeler le helper d'authentification.

### Recommandation

Ajouter des middlewares globaux :

- `superadmin/src/middleware.ts` pour `/admin/:path*` ;
- `arbinote/src/middleware.ts` pour `/admin/:path*` ;
- `teamManager/src/middleware.ts` pour `/admin/:path*`.

### Priorité

Haute.

---

## 2.10. Audit de sécurité SSO absent

### Constat

Le SSO contient une protection de type rate limiting login, mais pas de journalisation persistée visible des événements de sécurité.

### Recommandation

Journaliser :

- login réussi ;
- login échoué ;
- rate limit atteint ;
- logout ;
- reset password demandé ;
- reset password réussi ;
- changement de mot de passe ;
- création utilisateur ;
- désactivation utilisateur ;
- token invalide ;
- tentative de redirection bloquée.

### Priorité

Haute.

---

## 2.11. Protection CSRF à formaliser

### Constat

Le logout accepte `GET` et `POST`. Le cookie SSO est `SameSite=Lax`, ce qui aide, mais les actions sensibles devraient avoir une stratégie CSRF explicite.

### Recommandation

- ajouter un token CSRF pour les actions POST sensibles ;
- vérifier `Origin` / `Referer` pour les actions critiques ;
- documenter la politique CSRF ;
- ajouter des tests.

### Priorité

Moyenne à haute.

---

# 3. Manques qualité, lint et tests

## 3.1. Lint échoue sur tous les projets vérifiés

### Constat

La commande de lint exécutée sur `sso`, `superadmin`, `arbinote`, `matchsheet` et `teamManager` échoue.

### Résumé des erreurs

| Projet | État |
|---|---|
| `sso` | échec car dépendances manquantes |
| `superadmin` | échec avec erreurs `require()`, `any`, variables inutilisées, warnings images |
| `arbinote` | échec avec beaucoup de `any`, erreurs hooks, apostrophes non échappées, etc. |
| `matchsheet` | échec sur `require()` dans `next.config.ts` |
| `teamManager` | échec massif notamment parce qu'ESLint analyse des fichiers JS minifiés dans `public/js` |

### Recommandations

1. Installer les dépendances de `sso`.
2. Exclure `public/**` du lint dans `teamManager`.
3. Corriger les `require()` dans les `next.config.ts`.
4. Remplacer progressivement les `any` par des types précis.
5. Corriger les erreurs React hooks.
6. Ajouter une CI pour éviter les régressions.

### Priorité

Très haute.

---

## 3.2. Fichiers minifiés analysés par ESLint dans `teamManager`

### Constat

`teamManager` lint des fichiers comme :

- `public/js/bootstrap.min.js` ;
- `public/js/ScrollTrigger.min.js` ;
- `public/js/SplitText.js` ;
- `public/js/wow.min.js` ;
- `public/js/validator.min.js`.

### Recommandation

Ajouter une exclusion ESLint :

```js
ignores: [
  ".next/**",
  "node_modules/**",
  "public/**",
  "dist/**",
  "build/**"
]
```

### Priorité

Très haute.

---

## 3.3. Scripts de test manquants

### Constat

`arbinote` et `superadmin` ont des scripts `test`, mais `sso`, `teamManager` et `matchsheet` n'en ont pas.

### Recommandation

Ajouter Vitest ou équivalent sur :

- `sso` ;
- `teamManager` ;
- `matchsheet`.

### Tests prioritaires pour `sso`

- login valide club ;
- login valide superadmin ;
- refus club sans `teamId` ;
- refus superadmin avec `teamId` ;
- refus user inactif ;
- rate limiting login ;
- redirection sécurisée ;
- émission cookie ;
- logout.

### Tests prioritaires pour `teamManager`

- accès refusé à `SUPERADMIN` ;
- accès refusé sans `teamId` ;
- permissions admin/observateur ;
- CRUD joueurs/staff/matchs ;
- exports.

### Tests prioritaires pour `matchsheet`

- protection middleware ;
- accès refusé à `SUPERADMIN` ;
- chargement feuille ;
- signatures ;
- live events ;
- clôture.

### Priorité

Haute.

---

## 3.4. CI/CD monorepo absent ou à formaliser

### Recommandation

Ajouter un pipeline commun :

```text
install
lint sso
lint superadmin
lint arbinote
lint matchsheet
lint teamManager
test arbinote
test superadmin
test sso
test matchsheet
test teamManager
build all
migration dry-run
```

### Priorité

Haute.

---

# 4. Manques de configuration et documentation

## 4.1. Fichiers `.env.example` absents

### Constat

Il n'y a pas de fichiers `.env.example` visibles pour les apps principales.

### Impact

Les variables nécessaires au fonctionnement, notamment du SSO, de la base et d'API-Football, ne sont pas documentées dans un format directement exploitable.

### Recommandation

Ajouter :

```text
.env.example
arbinote/.env.example
superadmin/.env.example
teamManager/.env.example
matchsheet/.env.example
sso/.env.example
```

Variables importantes :

```env
DB_HOST=localhost
DB_PORT=3307
DB_USER=arbitres
DB_PASSWORD=change-me
DB_NAME=foot
DB_LOGGING=false

SSO_URL=http://localhost:3004
SSO_COOKIE_NAME=foot_sso_session
SSO_COOKIE_DOMAIN=
SSO_JWT_SECRET=change-me

API_FOOTBALL_KEY=
```

### Priorité

Haute.

---

## 4.2. Healthcheck manquant sur certaines apps

### Constat

`arbinote` et `superadmin` ont une route `/api/health`, mais `sso`, `teamManager` et `matchsheet` n'en ont pas visiblement.

### Recommandation

Ajouter `/api/health` partout avec :

- statut app ;
- connexion DB ;
- version/commit ;
- uptime ;
- configuration critique présente.

Pour `sso`, vérifier aussi :

- `SSO_JWT_SECRET` ;
- `SSO_COOKIE_NAME` ;
- connexion à `User` / `Team`.

### Priorité

Haute.

---

# 5. Manques de gouvernance des données partagées

## 5.1. Source de vérité des tables à clarifier

### Constat

Les apps partagent la même base `foot`. Certaines tables sont communes, d'autres sont spécifiques à chaque app.

### Risque

Sans règles claires, plusieurs apps peuvent modifier les mêmes données avec des interprétations différentes.

### Recommandation

Définir la propriété des domaines :

| Domaine | Source de vérité proposée | Consommateurs |
|---|---|---|
| fédérations / ligues / saisons / journées | `superadmin` | tous |
| équipes / clubs | `superadmin` | tous |
| comptes utilisateurs globaux | `sso` + `superadmin` | tous |
| joueurs / staff club | `teamManager` | `matchsheet` |
| compositions | `teamManager` puis verrouillage `matchsheet` | `matchsheet` |
| feuille de match | `matchsheet` | `teamManager`, `superadmin`, `arbinote` |
| votes arbitres | `arbinote` | `superadmin` |
| boutique / sponsors | `teamManager` | éventuellement public |

### Priorité

Très haute.

---

## 5.2. Processus de migration DB commun absent

### Recommandation

Créer un processus standard :

1. migrations versionnées ;
2. dry-run ;
3. backup avant migration ;
4. rollback ;
5. validation inter-apps ;
6. documentation des tables communes ;
7. interdiction stricte de `synchronize: true` en production.

### Priorité

Très haute.

---

## 5.3. Modèle multi-club à anticiper

### Constat

Le SSO lie actuellement un utilisateur club à un seul `teamId`.

### Limite

Un utilisateur ne peut pas facilement administrer plusieurs clubs ou plusieurs entités.

### Recommandation

Introduire un modèle :

```text
User
TeamMembership
  userId
  teamId
  role
  permissions
```

Puis permettre à l'utilisateur de choisir son contexte après login.

### Priorité

Moyenne à haute.

---

# 6. Manques autour du cycle de match

## 6.1. Machine d'état commune du match absente

### Constat

`matchsheet` couvre déjà plusieurs étapes : infos arbitre, contrôles, signatures avant-match, feuille live et clôture après-match. Mais il manque une machine d'état transversale commune aux apps.

### Recommandation

Ajouter un état global :

```text
DRAFT
SCHEDULED
CLUB_PREPARING
LINEUP_SUBMITTED
OFFICIALS_CONFIRMED
PRE_MATCH_SIGNED
IN_PROGRESS
FINISHED
POST_MATCH_SIGNED
CLOSED
PUBLISHED
ARCHIVED
CANCELLED
```

### Priorité

Très haute.

---

## 6.2. Processus bout-en-bout d'un match à formaliser

### Recommandation

Mettre en place le workflow :

```text
1. superadmin crée le match officiel
2. teamManager prépare joueurs, staff, convocations et composition
3. matchsheet contrôle joueurs/officiels et collecte signatures avant-match
4. matchsheet gère le live : buts, cartons, blessures, remplacements
5. matchsheet clôture la feuille avec signatures après-match
6. teamManager publie résultat, stats et résumé club
7. arbinote ouvre/clôture les votes arbitre selon les règles
8. superadmin consulte audit, anomalies et statut officiel
```

### Priorité

Très haute.

---

## 6.3. Verrouillage après clôture absent ou à renforcer

### Recommandation

Ajouter :

- `closedAt` ;
- `closedBy` ;
- `reopenedAt` ;
- `reopenedBy` ;
- `reopenReason` ;
- permissions spéciales ;
- audit obligatoire.

### Priorité

Haute.

---

# 7. Manques exploitation

## 7.1. Backup et restauration

### Constat

La base MariaDB utilise un volume Docker local, mais cela ne remplace pas une stratégie de sauvegarde.

### Recommandation

Ajouter :

- backup quotidien base `foot` ;
- backup des uploads ;
- sauvegarde chiffrée ;
- rétention ;
- test de restauration ;
- rollback migration ;
- procédure incident.

### Priorité

Très haute avant production.

---

## 7.2. Monitoring et alerting

### Recommandation

Ajouter :

- healthchecks toutes apps ;
- logs centralisés ;
- métriques erreurs 500 ;
- temps de réponse ;
- quota API-Football ;
- nombre de votes ;
- échecs notifications ;
- alertes sécurité SSO ;
- alerte DB down.

### Priorité

Haute.

---

## 7.3. Gestion des uploads

### Recommandation

Standardiser :

- validation MIME ;
- limite taille ;
- compression images ;
- thumbnails ;
- suppression fichiers orphelins ;
- stockage externe possible ;
- CDN ;
- scan antivirus si besoin ;
- droits d'accès ;
- politique de conservation.

### Priorité

Moyenne à haute.

---

# 8. Priorités globales recommandées

## Priorité 1 — À faire immédiatement

1. Ajouter `sso` dans `start.sh`.
2. Installer les dépendances `sso`.
3. Ajouter `.env.example` partout.
4. Corriger la config ESLint, surtout l'exclusion `public/**` dans `teamManager`.
5. Corriger les erreurs lint bloquantes.
6. Ajouter healthcheck SSO, `teamManager`, `matchsheet`.
7. Centraliser le code SSO dans un package partagé.
8. Ajouter middleware admin global pour `superadmin` et `arbinote`.
9. Définir la source de vérité des tables partagées.

## Priorité 2 — Sécurité et fiabilité

1. MFA pour `SUPERADMIN`.
2. Révocation de sessions.
3. Reset password.
4. Invitation / première connexion club.
5. Audit sécurité SSO.
6. Tests SSO.
7. CI/CD monorepo.
8. Backup / restore.
9. Machine d'état commune des matchs.
10. Verrouillage des feuilles clôturées.

Le backlog fonctionnel/produit (API-Football, notifications, PWA, espace supporter, boutique, sponsors, finance, RGPD) est priorisé séparément dans `roadmap.md`.

---

# 9. Checklist rapide

## Infrastructure

- [ ] `sso` lancé dans `start.sh`
- [ ] Ports documentés
- [ ] `.env.example` ajoutés
- [ ] Healthchecks sur toutes les apps
- [ ] Backup DB
- [ ] Backup uploads
- [ ] CI/CD monorepo

## SSO

- [ ] Package auth partagé
- [ ] Validation stricte des rôles
- [ ] MFA superadmin
- [ ] Reset password
- [ ] Invitation club
- [ ] Première connexion
- [ ] Révocation sessions
- [ ] Audit sécurité
- [ ] Portail SSO
- [ ] CSRF formalisé

## Qualité

- [ ] Dépendances `sso` installées
- [ ] ESLint corrigé
- [ ] `public/**` exclu du lint
- [ ] Tests `sso`
- [ ] Tests `teamManager`
- [ ] Tests `matchsheet`
- [ ] Builds validés

## Données

- [ ] Source de vérité définie
- [ ] Migrations communes
- [ ] Propriété des tables documentée
- [ ] Multi-club anticipé
- [ ] Audit transversal

## Match

- [ ] Machine d'état commune
- [ ] Préparation club formalisée
- [ ] Contrôles avant-match
- [ ] Signatures
- [ ] Live
- [ ] Clôture
- [ ] Verrouillage
- [ ] Publication résultat
- [ ] Votes arbitres synchronisés

## Exploitation

- [ ] Backup DB
- [ ] Backup uploads
- [ ] Test de restauration
- [ ] Monitoring / alerting
- [ ] Gestion des uploads standardisée

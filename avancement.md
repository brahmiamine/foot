# Avancement — audit fonctionnel de l'écosystème `foot`

## Contexte

Ce document remplace `roadmap.md`, `manquants.md` et `NEXT_STEPS.md` (supprimés par les commits `d457ab8`, `98a8e7e`, `820396a` — le `README.md` racine y renvoyait encore, ce qui était lui-même l'un des constats de cet audit). Il regroupe :

1. le panorama des 11 applications du dépôt ;
2. les fonctionnalités manquantes propres à chaque projet ;
3. les processus manquants **entre** les projets (la vraie dette du dépôt) ;
4. une table de suivi, mise à jour à chaque commit poussé sur `claude/analyse-fonctionnalites-processus-0fpdeq`, qui fait aussi office de liste de priorités.

État vérifié sur le code au 11/08/2026.

---

## Suivi & priorités

Mis à jour à chaque push. `✅ Fait` / `🔶 Partiel` / `⬜ À faire`.

| Rang | Action | Statut | Détail |
|---|---|---|---|
| 1 | `sso` dans `start.sh` ; `.env.example` harmonisé sur toutes les apps Next.js | ✅ Fait | `start.sh` lance désormais `sso` (port 3004) ; `.gitignore` de `arbinote`/`matchsheet`/`superadmin`/`teamManager`/`sso`/`sellerPortal` excepte `!.env.example` ; chaque app a maintenant un `.env.example` unique et complet (DB + SSO + notification, `SP_*`/SMTP pour `sellerPortal`, `API_FOOTBALL_KEY` pour `superadmin`) — les anciens `env.sso.example`/`env.notification.example` fragmentaires sont retirés d'`arbinote`/`matchsheet`/`superadmin`/`teamManager` |
| 2 | Extraire un package `auth-shared` (session, rôles, cookies) | ✅ Fait | `packages/auth-shared/src/session.ts` centralise la vérification JWT (issuer, forme du payload, nom du cookie, secret) — voir détail ci-dessous |
| 3 | Documenter la propriété des tables de `foot` + process de migration | ⬜ À faire | 7 apps écrivent dans la même base sans règle explicite par table |
| 4 | Middleware global sur chaque back-office (`superadmin`, `arbinote`, `teamManager`) | ⬜ À faire | Seul `matchsheet/src/middleware.ts` existe aujourd'hui |
| 5 | Machine d'état commune du match | ⬜ À faire | 4 apps touchent le même match sans statut partagé |
| 6 | CI (lint + tests) sur les 11 projets | ⬜ À faire | Aucun `.github/workflows` |
| 7 | `/api/health` partout + monitoring de base | ⬜ À faire | Seuls `arbinote` et `superadmin` l'exposent |
| 8 | Reset password + MFA + révocation de session dans `sso` | ⬜ À faire | |
| 9 | Brancher `billetterie` sur `payment-api` et sur `ob` | ⬜ À faire | Achat aujourd'hui marqué `PAID` immédiatement (mock) |
| 10 | Backup/restauration testée pour `foot` et les uploads | ⬜ À faire | |
| 11 | Espace supporter, finance/trésorerie, sponsors avancés, RGPD dans `teamManager` | ⬜ À faire | |
| 12 | Passerelle API + domaines de production | ⬜ À faire | Tâche infra, à déclencher au déploiement réel |

---

## 1. Panorama

| Projet | Rôle | Type | Tests | Health | PWA | `.env.example` |
|---|---|---|:---:|:---:|:---:|:---:|
| `sso` | Authentification centralisée | Générique | ❌ | ❌ | ❌ | ✅ |
| `arbinote` | Notation publique des arbitres | Générique | ✅ | ✅ | ✅ | ✅ |
| `matchsheet` | Feuille de match électronique (kiosque) | Générique | ❌ | ❌ | ✅ | ✅ |
| `superadmin` | Référentiels plateforme, audit | Générique | ✅ | ✅ | ✅ | ✅ |
| `teamManager` | Back-office club | Générique | ❌ | ❌ | ✅ | ✅ |
| `ob` | Vitrine + espace membre OB (lecture seule) | Custom | ❌ | ❌ | ❌ | ✅ |
| `payment-api` | Paiement mutualisé (Konnect/Paymee/Flouci) | Service | ✅ | ❌ | — | ✅ |
| `notification-api` | Centre de notifications | Service | ✅ | ❌ | — | ✅ |
| `sellerPortal` | Portail vendeur marketplace | Générique | ❌ | ❌ | ❌ | ✅ |
| `billetterie` | Billetterie multi-clubs (V1 mock) | Générique | ❌ | ❌ | ❌ | ✅ |
| `db` | Dump SQL de référence, pas une app | Référence | — | — | — | — |

---

## 2. Fonctionnalités manquantes, par projet

### `sso` — critique
**En place** : login staff/club + membre public (Google inclus), cookie JWT partagé, rate limiting login, affiliations supporter multi-clubs séparées du `teamId` staff.
**Manquant** : mot de passe oublié, MFA (TOTP) pour `SUPERADMIN`, révocation de session, invitation club en 2 temps, portail SSO (page d'accueil).

### `teamManager` — haute
**En place** : effectif, staff, discipline, actus/médias, boutique, sponsors, académie/recrutement, admin billetterie, PWA dynamique par club.
**Manquant** : espace supporter/communauté, checkout/paiement réel de la boutique, workflow contrat/facturation sponsors, finance/trésorerie (aucun module), RGPD (aucun consentement/export/suppression).

### `matchsheet` — moyenne
**En place** : avant-match, live, signatures, statut local de feuille, PWA, middleware de protection.
**Manquant** : tests automatisés, `/api/health`, verrouillage renforcé après clôture (raison de réouverture, audit dédié).

### `superadmin` — haute
**En place** : référentiels, audit, ClubBranding, lib `apiFootball.ts`.
**Manquant** : colonnes de matching (`api_football_id`/`fixture_id`, live score/minute), job de synchro live, écran de mapping équipes/fixtures, icônes PWA personnalisables par club.

### `billetterie` — haute
**En place** : catégories par club/match, règles de vente, achat, « mes billets », anti-survente, quota, fenêtre de vente.
**Manquant** : paiement réel (`payment-api`), vérification fiable de l'audience réservée (aujourd'hui auto-déclarée), scanner de contrôle stade (jamais commencé).

### `sellerPortal` / `ob` / `payment-api` / `notification-api` — moyenne
**En place** : `sellerPortal` scoping multi-club réel + ClubBranding ; `ob` live match + espace membre branché sur `notification-api` ; `payment-api`/`notification-api` seuls services avec tests + `.env.example` complets dès l'origine.
**Manquant** : backfill `club_id` manuel de `sellerPortal` en prod, pas de tests ; `ob` sans PWA installable et sans événement émis vers `notification-api` ; SMS et Web Push front annoncés mais absents de `notification-api`.

---

## 3. Ce qui manque entre les projets

**Le plus structurant** (✅ traité) : aucun package d'authentification partagé n'existait — la vérification du JWT SSO était réécrite dans `arbinote`, `matchsheet`, `superadmin`, `teamManager`, `ob` et `billetterie`. `packages/auth-shared/src/session.ts` centralise désormais l'issuer, la forme du payload, le nom du cookie et le secret ; chaque app garde son propre `src/lib/ssoSession.ts` en wrapper fin (typage `SsoUser` propre à ses rôles + helpers Server Components `cookies()`/`headers()`, incompatibles Edge Runtime donc hors du module partagé). Voir `packages/auth-shared/README.md` pour le détail et pourquoi ce n'est pas un package pnpm workspace (import par chemin relatif, pour ne pas changer la topologie de déploiement indépendant de chaque app). **Point à vérifier avant merge** : ce module partagé n'a pas de `node_modules` propre — il résout `jose` via un `node_modules` racine (`package.json`/`pnpm-lock.yaml` ajoutés à cet effet). Ça fonctionne pour `pnpm install` + `tsc --noEmit` de chaque app dans cet environnement, mais si une app est déployée avec un « Root Directory » Vercel strict (sans « Include files outside root directory »), le build ne verra pas `packages/` ni la racine du dépôt — à vérifier par app avant de compter dessus en production.

### A. Démarrage local incohérent — critique
- ~~`start.sh` ne lançait pas `sso`~~ → corrigé (rang 1 du suivi).
- Le port de `sellerPortal` (aucun port fixé dans `package.json`) entre en conflit avec celui documenté pour `sso` (3004) si tout est lancé en même temps — reste à corriger.
- ~~`.env.example` absent pour `sso`, `superadmin`, `teamManager`, `sellerPortal`~~ → corrigé (rang 1 du suivi).

### B. Sécurité transverse fragmentée — critique
- Aucun package `auth-shared` — logique de session/cookie/rôles dupliquée dans chaque app cliente.
- Un seul middleware global existe dans tout le dépôt (`matchsheet/src/middleware.ts`) ; les autres apps s'appuient sur des helpers appelés page par page.
- Pas de politique CSRF formalisée pour les actions sensibles (le logout accepte encore `GET`).
- Pas de journal de sécurité transverse (login échoué, rate limit, token invalide, reset password).

### C. Qualité et CI/CD absents — haute
- Aucun pipeline CI (pas de `.github/workflows`).
- Tests automatisés présents seulement sur 4 des 11 projets (`arbinote`, `superadmin`, `payment-api`, `notification-api`).
- Pas de lint commun ni de règle d'exclusion partagée entre projets Next.js.

### D. Observabilité au minimum — haute
- `/api/health` n'existe que dans `arbinote` et `superadmin`.
- Aucun monitoring/alerting transverse.
- Pas de stratégie de sauvegarde documentée au-delà du volume Docker local.

### E. Gouvernance de la base partagée — critique
- 7 applications lisent/écrivent la même base `foot` sans document formel de propriété par table.
- Pas de processus de migration commun (dry-run, backup avant migration, rollback).
- Modèle multi-club partiel : les affiliations supporter couvrent les `MEMBER`, mais un compte staff (`User.teamId`) reste lié à un seul club.

### F. Pas de cycle de vie commun du match — critique
Un même match traverse quatre applications distinctes, chacune avec son propre statut local (`matchsheet` a un `SheetStatus` local, mais rien ne relie la préparation `teamManager`, la création `superadmin` ou l'ouverture des votes `arbinote` à un état partagé). Aucune machine d'état transversale, aucun workflow bout-en-bout écrit noir sur blanc.

### G. Notifications : câblage émetteur partiel — moyenne
Le service central existe et 5 apps émettent déjà des événements (`arbinote`, `superadmin`, `matchsheet`, `teamManager`, `payment-api`). `ob` ne source rien (lecture seule). Convocation/composition/sponsor non branchables tant que le destinataire n'est pas un `User` résolvable. Web Push, FCM, SMS annoncés mais aucun actif.

### H. Billetterie : chaîne supporter → paiement → contrôle non fermée — haute
`ob/espace-membre/billets` reste un écran d'attente statique. `billetterie` ne parle pas à `payment-api` (achat mock). Le contrôle billetterie à l'entrée du stade (`ticketing-scanner`) n'existe dans aucun dossier du dépôt.

### I. Infra cible non branchée — moyenne
Aucun domaine de production configuré, pas de passerelle API unique, séparation des bases par domaine partielle (`payment-api`/`notification-api` isolées, le reste partage encore `foot`).

---

## 5. Note sur la documentation elle-même

Le `README.md` racine renvoyait vers `roadmap.md`, `manquants.md` et `NEXT_STEPS.md`, supprimés par les trois commits précédant cet audit — ce fichier les remplace et le README a été mis à jour en conséquence.

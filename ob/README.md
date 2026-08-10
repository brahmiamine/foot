# ob — site public de l'Olympique de Béja

Site public (landing page) du club, servi par un déploiement Next.js séparé
de `teamManager`. Lecture seule sur la base `foot` partagée avec
arbinote/superadmin/teamManager (mêmes tables `teams`, `matches`, `Player`,
et les tables `cms_*` propres à teamManager) — ce projet n'écrit jamais en
base ; toute la gestion de contenu (matchs, actus, effectif, galerie,
boutique) reste dans teamManager (`/admin`).

## Démarrage

```bash
cp .env.example .env.local   # renseigner DB_*, OB_TEAM_ID, NEXT_PUBLIC_TEAM_MANAGER_URL
npm install
npm run dev
```

La base MariaDB partagée peut être démarrée via `../start.sh` (voir la
racine du repo `foot`).

## Ce qui est branché en base vs statique

- **Base de données** : prochain match / résultats récents (`matches`,
  filtrés sur `is_public_visible`), actualités publiées (`cms_news`),
  effectif senior actif (`Player`), galerie publique (`cms_media_galleries`),
  boutique (`cms_products`), stade (`cms_stadiums`).
- **Calculé** : le classement (`PublicStandingsService`) est reconstruit à
  la volée à partir des matchs `FINISHED` entre équipes de la même
  fédération/catégorie/sport — il n'existe pas encore de table "classement"
  dans le schéma partagé (voir `../roadmap.md` § 1, intégration
  API-Football pas encore faite). Le classement n'est donc fiable que si
  tous les matchs de la ligue sont saisis côté ArbiNote/cardManager.
- **Statique** : la section "Histoire du club" (`HistorySection.tsx`) est du
  contenu éditorial en dur, faute de table CMS dédiée à ce jour.
- **Billetterie/paiement boutique** : pas encore implémentés côté produit
  (voir `../roadmap.md` § 4.2) — les deux CTA renvoient vers la section
  contact plutôt que vers un flux d'achat inexistant.

## Design

Recrée le prototype Claude Design `project/ob/Olympique de Béja.dc.html`
(thème rouge/noir "Les Cigognes de Béja", inspiré d'arsenal.com) en
composants Next.js App Router, tokens CSS dans `src/app/globals.css`.

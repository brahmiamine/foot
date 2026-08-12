# Audit fonctionnel et technique de l'écosystème Foot — TODO

> **Date de l'analyse :** 12 août 2026  
> **Périmètre :** code exécutable, routes, contrôleurs, services, entités, migrations/SQL, configuration, tests et manifests des onze projets.  
> **Exclusion demandée :** aucun fichier `README.md` n'a été utilisé comme source. Les conclusions ci-dessous décrivent le code présent, et non une intention documentaire.

## 1. Résumé exécutif

Le dépôt forme une plateforme football modulaire autour d'une base MySQL partagée et de onze applications déployables : trois API NestJS (`payment-api`, `notification-api`, `marketplace-api`), un fournisseur d'identité (`sso`), cinq back-offices ou applications métier (`superadmin`, `teamManager`, `matchsheet`, `arbinote`, `billetterie`), un portail public de club (`ob`) et un portail vendeur (`sellerPortal`).

Les principaux parcours transverses sont déjà codés : authentification SSO et contrôle de révocation, administration des référentiels sportifs, préparation et clôture d'une feuille de match, publication sur le site public, vente de billets ou d'articles via l'API de paiement, marketplace vendeur/modération, et notifications multicanales. Les communications critiques utilisent soit une session JWT SSO, soit une clé `x-api-key`, soit des webhooks signés et idempotents.

Les risques dominants ne sont pas l'absence de fonctionnalités d'écran, mais la cohérence distribuée : plusieurs projets écrivent les mêmes tables, les contrats sont recopiés, certaines intégrations sont « best effort », le traitement asynchrone dépend d'appels externes, et les tests restent surtout locaux. Les priorités recommandées sont donc : contrats partagés/versionnés, tests end-to-end multi-projets, ownership de schéma renforcé, observabilité distribuée, durcissement des webhooks/outbox, stockage objet des médias, puis complétion des canaux et parcours encore partiels.

## 2. Méthode et cartographie

### 2.1 Sources de vérité inspectées

- Arborescences `src/app`, contrôleurs NestJS, services, entités TypeORM et DTO.
- Middlewares, gardes, clients HTTP, configuration d'environnement et mécanismes de session.
- Tests `*.test.*`, `*.spec.*`, tests d'intégration et scripts de build/lint.
- SQL central, migrations et scripts d'exploitation de base.
- Aucun README n'a été lu ni utilisé.

### 2.2 Vue d'ensemble

| Projet | Type | Responsabilité principale | Dépendances inter-projets observées |
|---|---|---|---|
| `sso` | Next.js | Identité, sessions, membres, MFA, OAuth Google | DB partagée; consommé par presque toutes les apps |
| `superadmin` | Next.js | Référentiels globaux et gouvernance | SSO, matchsheet, notification-api, DB |
| `teamManager` | Next.js | Exploitation complète d'un club | SSO, payment-api, marketplace-api, notification-api, DB |
| `matchsheet` | Next.js | Feuille de match officielle et live | SSO partagé, notification-api, DB; appelé par superadmin |
| `arbinote` | Next.js | Notation publique des arbitres | SSO admin, notification-api, DB |
| `billetterie` | Next.js | Réservation, paiement et contrôle des billets | SSO, payment-api, DB |
| `ob` | Next.js | Site public/membre d'un club | teamManager/DB, SSO, billetterie, notification-api |
| `marketplace-api` | NestJS | Catalogue multi-vendeur, commandes, retours, payouts | clés service; consommée par sellerPortal/teamManager |
| `sellerPortal` | Next.js | Back-office vendeur | marketplace-api; auth vendeur locale |
| `payment-api` | NestJS | Orchestration Flouci/Konnect/Paymee | notification-api; webhooks vers applications clientes |
| `notification-api` | NestJS | Notifications, préférences, templates et livraisons | SSO, Redis, fournisseurs email/push/SMS |

### 2.3 Modèle d'intégration réel

1. **Données sportives communes :** `superadmin`, `teamManager`, `matchsheet`, `arbinote`, `billetterie` et `ob` déclarent chacun des entités sur un sous-ensemble du même domaine (équipes, matchs, joueurs, fédérations…). Cela donne une lecture rapide et évite une API centrale, mais couple tous les déploiements au schéma SQL.
2. **Identité :** les applications Next.js vérifient le JWT SSO via le module `packages/auth-shared`; l'introspection distante permet de constater une révocation. `superadmin` utilise aussi les endpoints internes du SSO pour créer/modifier/désactiver les comptes staff.
3. **Appels backend :** les API internes utilisent des clés de service et une liste de clients. Le contexte de corrélation est présent dans les API NestJS, mais pas uniformément propagé par toutes les apps Next.js.
4. **Paiements :** les apps créent un paiement dans `payment-api`; le fournisseur rappelle l'API; celle-ci publie ensuite un webhook signé vers l'application source; celle-ci applique idempotemment l'effet métier.
5. **Notifications :** les producteurs appellent `POST /internal/notifications`; l'API résout les destinataires/préférences, persiste et distribue par file. `teamManager` ajoute une outbox locale pour certaines publications.

---

## 3. Analyse détaillée par projet

## 3.1 `sso` — identité et accès unifiés

### Fonctionnalités présentes

- Connexion, inscription membre et déconnexion; cookie de session JWT partagé entre sous-domaines.
- Connexion différenciée membre/staff et choix d'équipe au login.
- Inscription rattachée à une équipe et gestion des affiliations membre-équipe.
- Consultation et mise à jour du profil membre courant.
- Mot de passe oublié, jeton de réinitialisation, email SMTP et changement du mot de passe connecté.
- OAuth Google avec callback, échange du code et récupération du profil.
- MFA TOTP : préparation, activation, validation au login et désactivation.
- Déconnexion globale par incrément/version de session et introspection de session.
- Journal des événements de sécurité avec écran de consultation.
- API interne de cycle de vie utilisateur : créer, lire, modifier, supprimer, activer et désactiver.
- Endpoint de santé et liste d'équipes accessible aux formulaires.

### Flux internes

1. Les identifiants sont validés et le mot de passe comparé au hash.
2. Si MFA est actif, une étape intermédiaire réclame le code TOTP.
3. Le serveur signe un JWT incluant identité, rôle, équipe et version de session, puis pose le cookie.
4. Une application consommatrice valide localement la signature, puis peut appeler l'introspection pour confirmer que la session n'a pas été révoquée.
5. « Déconnexion partout » invalide les jetons précédents sans liste noire par jeton.

### Manquements / TODO

- **P0 — politique de révocation non uniforme :** les consommateurs peuvent choisir un mode fail-open/fail-closed; une panne SSO peut donc produire des décisions différentes suivant l'application. Définir une matrice par sensibilité et la tester en panne.
- **P0 — secrets partagés :** la signature symétrique impose la distribution de `SSO_JWT_SECRET`. Passer à des clés asymétriques et exposer un JWKS avec rotation (`kid`).
- **P1 — OAuth incomplet :** seul Google est présent; formaliser liaison/déliaison de comptes, collision d'email et révocation du fournisseur.
- **P1 — sécurité opérationnelle :** ajouter limitation distribuée des tentatives, verrouillage progressif, détection d'identifiants compromis et alertes MFA/récupération.
- **P1 — cycle de vie des affiliations :** prévoir validation/invitation, expiration, historique et retrait explicite d'une affiliation membre.
- **P2 — récupération MFA :** ajouter codes de secours, renouvellement du secret et parcours de récupération administré/audité.
- **P2 — sessions visibles :** fournir la liste des appareils/sessions et la révocation sélective.

## 3.2 `superadmin` — gouvernance globale

### Fonctionnalités présentes

- Tableau de bord et statistiques globales.
- CRUD des fédérations, ligues, saisons, journées, équipes, arbitres, motifs de carton et matchs.
- Activation/désactivation des fédérations et ligues.
- Imports en masse d'équipes et d'arbitres; uploads de logos/photos via les routes partagées.
- Affectation des équipes, arbitres et journées; contraintes empêchant certaines suppressions lorsque des enfants existent.
- Gestion des matchs : création, modification, annulation et réouverture.
- Branding d'équipe.
- Journal d'audit.
- Administration des clubs : invitations staff, création synchronisée d'identité SSO, statut/rôle, réinitialisation et suppression.
- Acceptation publique d'une invitation par jeton.

### Flux et interactions

- La session SSO protège le back-office et détermine le rôle superadmin.
- La création d'un utilisateur club appelle l'API interne SSO puis persiste le rattachement métier; une compensation est prévue côté client d'identité en cas d'échec partiel.
- La réouverture d'un match met à jour le domaine global puis appelle la route interne de `matchsheet`, authentifiée par clé service, afin de rouvrir la feuille.
- Les mutations sensibles alimentent l'audit; les notifications d'invitation passent par SMTP et/ou `notification-api` selon le chemin.

### Manquements / TODO

- **P0 — transaction distribuée identité/métier :** remplacer la compensation ponctuelle par une saga/outbox persistée avec reprise et écran de réconciliation.
- **P0 — réouverture multi-système :** rendre l'opération superadmin→matchsheet idempotente, journalisée et réessayable; aujourd'hui une coupure peut laisser match et feuille divergents.
- **P1 — import :** ajouter validation préalable (« dry run »), rapport ligne par ligne, limite, reprise et rollback d'un lot.
- **P1 — gouvernance :** ajouter un workflow d'approbation à quatre yeux pour annulation/réouverture, changement de compétition et suppression de comptes.
- **P1 — historique :** versionner explicitement les changements de calendrier/référentiel au lieu de compter uniquement sur un journal générique.
- **P2 — exploitation :** écran de santé des dépendances SSO/matchsheet/notification et files de réconciliation.

## 3.3 `teamManager` — gestion opérationnelle du club

### Fonctionnalités présentes

- **Organisation :** équipes, utilisateurs, rôles, permissions, membres, périmètre par catégorie, paramètres et audit.
- **Effectif :** joueurs, staff, statistiques, blessures, suspensions, amendes, cartons/motifs, notes et exports CSV/PDF/Excel.
- **Sport :** matchs officiels et amicaux, formations, compositions sur terrain, convocations, entraînements/blocs/invitations, tactiques.
- **Logistique :** déplacements, participants, véhicules, stades.
- **Contenu public :** actualités riches et médias associés, annonces, galeries, médias, histoire, chiffres, palmarès, informations/contact/réseaux du club, branding.
- **Académie/recrutement :** catégories, informations, candidatures joueur, besoins et candidatures recrutement.
- **Commercial :** sponsors et demandes, contrats exportables; catalogue boutique, catégories, produits, commandes et retours de paiement.
- **Billetterie :** catégories, règles de vente et offres par match.
- **Marketplace :** modération des produits du club via `marketplace-api`.
- **Notifications :** composition ciblée, abonnements push, outbox persistée avec planification de retry.
- **Médias :** uploads dédiés et upload fragmenté initialisation/chunks/finalisation.
- PWA, i18n français/anglais/arabe, formulaires publics d'inscription/contact/sponsor/recrutement.

### Flux internes majeurs

- Chaque server action obtient la session, vérifie permission et périmètre de catégorie, puis appelle un service TypeORM.
- La publication d'une actualité peut écrire simultanément le contenu et un événement d'outbox; un endpoint interne traite ensuite les lots et contacte `notification-api`.
- Une commande boutique est créée en attente, un paiement est initialisé, puis le webhook signé confirme ou échoue la commande avec garde d'idempotence.
- La modération marketplace est proxifiée vers les endpoints internes de `marketplace-api` avec clé du service.
- Le contenu administré est directement lu par `ob` dans les tables partagées; les liens de formulaires publics peuvent renvoyer vers teamManager.

### Manquements / TODO

- **P0 — surface très large dans un monolithe :** définir des bornes de modules et tests d'architecture; les dizaines d'actions/services partagent DB et autorisation, ce qui augmente le risque de contournement.
- **P0 — autorisations :** centraliser systématiquement l'autorisation dans la couche service/policy, pas seulement dans les server actions; tester toutes les mutations contre IDOR et changement de `teamId`.
- **P0 — outbox :** remplacer/doubler l'endpoint manuel par un worker dédié avec verrouillage concurrent, lease, dead-letter queue, métriques et alerte sur ancienneté.
- **P1 — médias :** stockage local et nombreuses routes d'upload à unifier derrière stockage objet, antivirus, contrôle MIME réel, quotas, URLs signées et nettoyage des fragments orphelins.
- **P1 — paiements/commandes :** réserver le stock transactionnellement, expirer les commandes en attente et réconcilier périodiquement avec payment-api.
- **P1 — confidentialité :** formaliser rétention/consentement/export/suppression pour blessures, candidatures, documents et coordonnées.
- **P1 — exports :** déplacer les gros exports en tâches asynchrones et protéger contre injection CSV.
- **P2 — formulaires :** ajouter anti-spam/CAPTCHA, accusé de réception, suivi de statut et purge configurable.
- **P2 — tests :** compléter les tests des nombreuses actions métier; la couverture visible est concentrée sur quelques services et webhooks.

## 3.4 `matchsheet` — feuille de match officielle

### Fonctionnalités présentes

- Sélection d'un match puis parcours en six espaces : synthèse, avant-match, officiels, contrôles, live et après-match.
- Création/lecture de feuille, contrôle des joueurs et réserves.
- Gestion des compositions, titulaires/remplaçants et formations.
- Affectation et validation des officiels.
- Saisie live des buts, cartons, remplacements et blessures.
- Signatures, clôture/validation de la feuille et restrictions après clôture.
- Réouverture interne appelée par superadmin.
- Notifications lors d'événements du workflow.

### Séquencement métier

1. Le match commun est sélectionné et une feuille est créée ou chargée.
2. Chaque équipe prépare sa composition; les contrôles d'éligibilité et éventuelles réserves sont consignés.
3. Les officiels complètent et valident leurs informations.
4. Pendant le match, les événements modifient le score et la chronologie.
5. Après match, les parties signent; la feuille est clôturée et devient immuable.
6. Une exception nécessite une décision superadmin, puis un appel service-à-service de réouverture.

### Manquements / TODO

- **P0 — concurrence live :** ajouter version optimiste/ETag ou verrou explicite; deux officiels peuvent écraser des événements concurrents.
- **P0 — preuve et non-répudiation :** renforcer les signatures (identité, horodatage fiable, hash du snapshot, chaîne d'audit append-only).
- **P0 — mode terrain :** prévoir fonctionnement hors ligne, file locale, synchronisation et résolution de conflits pour les stades à réseau instable.
- **P1 — corrections :** conserver les versions avant/après et le motif de chaque correction/réouverture.
- **P1 — événements :** publier un contrat d'événement versionné afin que score public, statistiques, sanctions et notifications convergent sans lire directement les tables.
- **P2 — validation réglementaire :** rendre les règles par fédération/saison configurables et testées plutôt que dispersées dans les services.

## 3.5 `arbinote` — notation et transparence arbitrale

### Fonctionnalités présentes

- Navigation par fédération/ligue, équipes, journées, matchs et arbitres.
- Vote par critères configurables avec étoiles, empreinte navigateur et preuve signée.
- Prévention du double vote, historique « mes votes » et comparaison vote utilisateur/agrégat.
- Calculs de pondération, crédibilité et classement bayésien; statistiques arbitres/équipes/matchs.
- Détection d'anomalies et création d'alertes selon comportement, distribution et signaux du vote.
- Back-office : votes filtrés, détails, édition/suppression/modération en masse, export, critères, anomalies, alertes, historique/résolution/ignorance.
- Contacts publics et traitement admin.
- Partage d'une carte image, PWA, push, SEO, sitemap et pages légales/transparence.

### Flux de vote

1. Le visiteur choisit compétition et match.
2. Le client calcule une empreinte; le serveur vérifie fenêtre de vote, unicité, critères et preuve HMAC.
3. Le vote est stocké puis pondéré; l'agrégat et la crédibilité du match sont recalculables.
4. La détection d'anomalie peut créer une alerte et notifier un administrateur.
5. Un modérateur examine distribution et historique, modifie/supprime un vote, puis résout ou ignore l'alerte.

### Manquements / TODO

- **P0 — identité modérateur manquante :** une route de modération contient explicitement un TODO pour récupérer l'ID admin; l'audit n'est donc pas pleinement attribuable.
- **P0 — empreinte comme identité :** elle est contournable, sensible au changement d'appareil et comporte un risque vie privée. Ajouter compte optionnel, rate limit distribué, challenge anti-bot et politique de consentement/rétention.
- **P1 — explicabilité :** versionner algorithmes, seuils et critères; afficher quel modèle a produit chaque score/alerte.
- **P1 — recalcul :** prévoir jobs idempotents de recalcul global après changement d'un critère ou d'un poids.
- **P1 — modération :** double validation pour suppression massive, corbeille/restauration et justification obligatoire.
- **P2 — équité :** mesurer biais par ligue, volume minimal, campagne coordonnée et intervalle d'incertitude.

## 3.6 `billetterie` — vente et contrôle d'accès

### Fonctionnalités présentes

- Catalogue des matchs et catégories/tarifs/règles de vente.
- Achat d'un billet avec réservation en statut pending et initialisation d'un paiement externe.
- Page de retour et espace « mes billets » relié au profil/affiliations SSO.
- Webhook paiement idempotent, activation/annulation du billet et purge cron des réservations expirées.
- QR signé par secret et références non prévisibles.
- Scanner caméra en ligne et manifeste hors ligne.
- Journal de scans, anti-double entrée et écran des billets dont l'audience JWT ne correspond pas.
- Endpoints de santé et d'administration protégés.

### Flux d'achat et scan

1. Le supporteur authentifié sélectionne une offre; disponibilité/règles sont contrôlées.
2. Une réservation temporaire et son billet sont écrits, puis `payment-api` crée la transaction.
3. Le navigateur passe chez le fournisseur; le résultat fiable vient du webhook signé.
4. Le webhook idempotent confirme le billet; le QR signé devient utilisable.
5. Au stade, le scanner vérifie signature, statut, match, audience et scan antérieur; il écrit le journal.
6. Hors ligne, le manifeste permet la validation locale, à synchroniser au retour réseau.

### Manquements / TODO

- **P0 — cohérence de stock :** garantir un verrou/UPDATE conditionnel atomique sous forte concurrence et tester le surbooking multi-processus.
- **P0 — scan hors ligne :** documenter et coder une vraie synchronisation des scans avec déduplication/conflit entre plusieurs portiques, pas seulement téléchargement du manifeste.
- **P0 — rotation QR :** introduire `kid`, rotation/expiration des secrets et révocation ciblée de billet.
- **P1 — réconciliation :** job périodique entre billets pending, paiements et webhooks perdus; dead-letter et outil admin de reprise.
- **P1 — remboursement/transfert :** parcours complet d'annulation, remboursement, transfert nominatif et réémission du QR.
- **P1 — contrôle :** identité du terminal, affectation à un portique, logs inviolables et métriques temps réel.
- **P2 — fiscalité :** facture/reçu, taxes, mentions de vente et export comptable.

## 3.7 `ob` — expérience publique et membre du club

### Fonctionnalités présentes

- Accueil de club paramétré par `OB_TEAM_ID`, actualités et détail, communiqués, calendrier et section match live.
- Présentation du club : histoire, chiffres, honneurs, stade/coordonnées et réseaux.
- Formation/academie, recrutement, sponsors, galerie et contact.
- Accès boutique et redirections/formulaires vers teamManager.
- Espace membre : profil, billets, commandes, notifications et préférences.
- Notifications push, session/profil SSO, lien vers billetterie.
- Rendu des médias tenant compte d'un éventuel domaine teamManager/reverse proxy.

### Flux

- Les pages publiques lisent les tables de contenu produites par teamManager, filtrées par équipe.
- Les formulaires publics pointent vers les parcours teamManager et conservent l'identifiant d'équipe.
- L'espace membre résout la session SSO, puis consulte notifications/préférences et redirige vers billetterie ou boutique.
- Le live lit périodiquement une route locale appuyée sur le domaine match partagé.

### Manquements / TODO

- **P0 — isolation multi-tenant :** auditer toutes les requêtes pour imposer `OB_TEAM_ID/teamId`; une omission exposerait les données d'un autre club.
- **P1 — couplage DB :** introduire une API de contenu ou vues de lecture versionnées; le portail ne doit pas dépendre des entités internes de teamManager.
- **P1 — live :** remplacer polling/lecture DB par flux d'événements SSE/WebSocket avec reprise (`Last-Event-ID`).
- **P1 — résilience :** cache/revalidation, placeholders et comportement explicite quand SSO, teamManager, billetterie ou notification-api sont indisponibles.
- **P2 — boutique :** clarifier un seul parcours entre boutique locale teamManager et marketplace afin d'éviter commandes/comptes éclatés.
- **P2 — accessibilité/SEO :** compléter tests automatiques a11y, métadonnées structurées par contenu et budget de performance média.

## 3.8 `marketplace-api` — cœur de marketplace

### Fonctionnalités présentes

- Inscription/login vendeur et JWT vendeur.
- Profil boutique/vendeur.
- Catégories de produits.
- CRUD produit, images, variantes et stock/inventaire.
- Soumission/retrait et workflow de modération; endpoints internes pour club/sellerPortal.
- Commandes globales, sous-commandes vendeur et lignes; consultation/changement d'état/expédition.
- Retours et décisions internes.
- Payouts vendeur et endpoints internes de traitement.
- Notifications métier du vendeur.
- Throttling, Helmet, validation DTO, corrélation et authentification service-à-service.

### Flux produit/commande

1. Le vendeur crée produit, images, variantes et inventaire via sellerPortal.
2. Il soumet le produit; l'état passe en attente.
3. Le club modère depuis teamManager; approbation rend le produit publiable, rejet conserve la décision.
4. Une commande globale est ventilée en sous-commandes vendeur et lignes.
5. Le vendeur traite/expédie; un retour peut être demandé puis accepté/rejeté.
6. Les montants éligibles alimentent les payouts.

### Manquements / TODO

- **P0 — paiement absent du graphe visible :** relier explicitement commande↔payment-api, idempotence de checkout, remboursement et compensation de stock.
- **P0 — concurrence inventaire :** réservation atomique, expiration et prévention du stock négatif avec tests de course.
- **P0 — isolation vendeur :** multiplier les tests d'autorisation objet sur chaque produit, variante, commande, retour et payout.
- **P1 — machine à états :** centraliser et valider les transitions produits/commandes/retours/payouts avec historique append-only.
- **P1 — commissions :** modèle explicite de frais, taxes, devise, arrondis, soldes et rapprochement financier.
- **P1 — recherche :** indexation, filtres, pagination stable et cache catalogue public.
- **P2 — modération média :** antivirus, limites, droits d'auteur et conservation des décisions.

## 3.9 `sellerPortal` — back-office vendeur

### Fonctionnalités présentes

- Inscription, login/logout, mot de passe oublié/réinitialisé et changement de mot de passe.
- Tableau de bord synthétique.
- Profil vendeur et paramètres de compte.
- Produits : liste, création, édition, duplication, activation/désactivation, soumission à modération et variantes.
- Catégories et équipes de rattachement.
- Inventaire et ajustement du stock.
- Commandes, détail, statut, préparation/expédition.
- Retours, revenus, payouts et notifications lues/non lues.
- Façade BFF Next.js vers les endpoints vendeur et internes de `marketplace-api`.

### Flux

- Le portail maintient une session vendeur locale (`SP_JWT_SECRET`/cookie).
- Les routes Next.js identifient le vendeur, puis appellent marketplace-api avec clé de service et `sellerId`.
- Les écrans consomment cette façade locale, évitant d'exposer la clé au navigateur.

### Manquements / TODO

- **P0 — double identité :** l'auth vendeur est séparée du SSO et semble dupliquée entre portail et API. Choisir une autorité unique, ajouter MFA et gestion centralisée des sessions.
- **P0 — confiance dans `sellerId` :** marketplace-api doit dériver le vendeur de l'identité signée/service context, jamais faire confiance à un query param seul; ajouter tests d'usurpation.
- **P1 — mot de passe :** unifier politiques, rate limits, révocation et événements de sécurité avec SSO.
- **P1 — médias produits :** le portail possède les entités mais aucun parcours d'upload clairement centralisé dans l'inventaire des routes; fournir stockage et traitement d'images partagé.
- **P1 — exploitation vendeur :** ajouter export, factures, bordereaux, suivi transporteur et litiges.
- **P2 — UX financière :** détailler disponible/en attente/réserve, commissions et rapprochement par commande.

## 3.10 `payment-api` — orchestration des paiements

### Fonctionnalités présentes

- Création/lecture de paiement et modèle persistant d'état.
- Adaptateurs Flouci, Konnect et Paymee avec endpoints d'initialisation/callback.
- Validation de configuration par fournisseur.
- Webhooks fournisseurs, normalisation de statut et secret de webhook sortant.
- Mapping `WEBHOOK_URLS` vers les applications appelantes.
- Outbox persistée pour propager les résultats.
- Appel best-effort de `notification-api`.
- Authentification par clés de service, validation, sécurité HTTP et corrélation.

### Séquencement

1. Un service client appelle l'endpoint du fournisseur choisi avec référence/idempotency key, montant et contexte métier.
2. payment-api persiste l'intention puis obtient l'URL de paiement du fournisseur.
3. Le fournisseur appelle son callback; signature/référence/statut sont validés et normalisés.
4. La transition de paiement et un événement outbox sont écrits.
5. Un dispatcher envoie un webhook signé à l'URL enregistrée de l'application d'origine et peut déclencher une notification.
6. Le consommateur déduplique l'événement avant de confirmer billet/commande.

### Manquements / TODO

- **P0 — worker outbox :** confirmer un processus autonome avec verrou, retry exponentiel, DLQ et métriques; une entité outbox sans exploitation robuste ne garantit pas la livraison.
- **P0 — idempotence bout en bout :** contrainte unique sur clé client + application, répétition sûre des callbacks fournisseur et webhook sortant avec identifiant stable.
- **P0 — intégrité financière :** montants en unité mineure/decimal strict, devise imposée, vérification serveur du montant fournisseur et immutabilité des transitions finales.
- **P1 — remboursements :** API unifiée refund/partial refund, callbacks, annulation et litiges.
- **P1 — réconciliation :** polling fournisseur des paiements ambigus, rapport quotidien et reprise admin.
- **P1 — secrets :** rotation des clés API/webhook, `kid`, coffre de secrets et signature avec timestamp contre rejeu.
- **P2 — conformité :** politique de rétention, masquage des payloads, audit d'accès et séparation environnements marchand.

## 3.11 `notification-api` — centre de notifications

### Fonctionnalités présentes

- Entrée service-à-service unique avec authentification et idempotence des événements.
- Résolution d'un utilisateur ou d'une audience/groupe partagé.
- Entités notification, événement reçu, livraison par canal, préférences, locale, abonnement push et template.
- Canaux email, push et SMS; fournisseurs SMTP, SendGrid, Resend, Web Push, FCM et TunisieSMS.
- Templates localisés et choix de langue utilisateur.
- File Redis, producer/consumer, tentatives et état de livraison.
- API utilisateur pour lister, lire, tout marquer lu, préférences et abonnements push.
- Administration des templates/statistiques et consultation d'audit.
- Validation JWT SSO avec introspection optionnelle et clés de service pour les producteurs.

### Flux

1. Le producteur envoie type, application, destinataire/audience, variables et clé d'idempotence.
2. Le service authentifie l'application et déduplique l'événement.
3. Il résout les destinataires, leur locale et préférences.
4. Il crée notifications/livraisons et met les travaux en file Redis.
5. Le worker rend le template et appelle chaque fournisseur.
6. Le résultat, les tentatives et l'erreur sont persistés; le client peut lire/marquer la notification in-app.

### Manquements / TODO

- **P0 — fournisseur SMS factice possible :** `not-implemented-sms.provider` lève explicitement une erreur; interdire sa sélection en production ou implémenter un fallback réel.
- **P0 — source destinataire partagée :** le résolveur dépend d'un annuaire/DB commun; définir un contrat d'identité et gérer utilisateurs supprimés, emails/téléphones invalides et consentement.
- **P0 — politique de retry :** distinguer erreurs permanentes/transitoires, backoff, DLQ, replay contrôlé et circuit breaker fournisseur.
- **P1 — préférences réglementaires :** finalité, consentement par canal, plages silencieuses, désabonnement email et preuve d'opt-in.
- **P1 — templates :** version, prévisualisation, validation des variables, rollback et approbation avant publication.
- **P1 — délivrabilité :** webhooks de bounce/complaint/unsubscribe et invalidation automatique des endpoints push.
- **P2 — quotas :** limites par application/audience/utilisateur et regroupement anti-fatigue.

---

## 4. Processus et interactions entre projets

### 4.1 Authentification staff et autorisation

```text
Navigateur -> sso : login (+ MFA éventuel)
sso -> Navigateur : cookie JWT partagé
Navigateur -> superadmin/teamManager/matchsheet/arbinote/billetterie/ob
Application -> auth-shared : vérification signature, rôle, équipe, audience
Application -> sso /api/session/introspect : validation version/révocation
Application -> domaine : contrôle permission + team/category scope
```

Points d'attention : audience propre à chaque application, cookie commun, révocation distante, propagation du `teamId`, différence fail-open/fail-closed.

### 4.2 Création d'un club et de son administration

1. Superadmin crée fédération, ligue, saison, journée et équipe.
2. Il configure le branding de l'équipe.
3. Il invite un administrateur de club.
4. Le destinataire accepte le jeton; superadmin appelle l'API interne SSO pour créer l'identité.
5. Le rattachement utilisateur/équipe/rôle est créé dans le domaine partagé.
6. L'administrateur se connecte au SSO et accède à teamManager dans son périmètre.
7. Il configure club, staff, joueurs, contenu et offres.
8. `ob` expose le contenu de cette équipe grâce à `OB_TEAM_ID`.

Cas d'échec à couvrir : email déjà existant, identité créée mais rattachement échoué, invitation expirée/rejouée, branding partiellement uploadé.

### 4.3 Cycle complet d'un match

1. `superadmin` programme le match dans une journée et assigne équipes/arbitres.
2. `teamManager` prépare effectif, convocation et composition.
3. `matchsheet` ouvre la feuille, contrôle joueurs/réserves et officiels.
4. Pendant la rencontre, buts/cartons/remplacements/blessures sont saisis.
5. `ob` présente score et événements live; `notification-api` peut diffuser les événements utiles.
6. Après match, les parties signent et `matchsheet` clôture la feuille.
7. Les statistiques/sanctions deviennent visibles dans teamManager; le match devient éligible à la notation dans arbinote selon sa fenêtre.
8. En cas de correction, superadmin réouvre le match puis appelle matchsheet; nouvelle validation et nouvelle clôture.

Cas d'échec : saisies concurrentes, clôture pendant un événement en vol, notification perdue, réouverture d'un seul côté, correction après votes.

### 4.4 Vote et modération d'arbitre

1. Le supporteur ouvre le match depuis arbinote.
2. Le client génère empreinte et preuve; le serveur vérifie éligibilité et absence de doublon.
3. Les notes par critère sont persistées et pondérées.
4. Classement bayésien/crédibilité agrègent le signal.
5. Une anomalie crée une `VoteAlert` et peut déclencher `notification-api`.
6. L'admin inspecte les votes, l'historique et la distribution.
7. Il modère, exporte, résout ou ignore; un audit attribué doit conserver auteur et motif.

### 4.5 Achat et utilisation d'un billet

```text
Supporteur -> billetterie : réserver offre
billetterie -> DB : billet/réservation pending
billetterie -> payment-api : créer paiement (provider, montant, référence)
payment-api -> fournisseur : initialiser
fournisseur -> payment-api : callback signé
payment-api -> outbox -> billetterie : webhook métier signé
billetterie -> DB : webhook dédupliqué, billet paid/active
Supporteur -> scanner : QR signé
scanner -> billetterie : validation + TicketScanLog
```

La page retour n'est pas la preuve du paiement; seul le callback vérifié doit activer le billet. La purge cron libère les réservations non payées. En offline, la synchronisation multi-terminal reste le point critique.

### 4.6 Achat boutique du club

1. teamManager publie catégories/produits et stock.
2. Le supporter consulte `/boutique/[teamId]` (directement ou via ob).
3. Une commande et ses lignes sont créées en attente avec snapshot prix.
4. teamManager initialise payment-api.
5. Callback fournisseur → payment-api → webhook signé teamManager.
6. teamManager déduplique, marque payé, décrémente/réserve le stock et affiche le retour/les commandes.
7. Une notification de confirmation est envoyée via l'outbox/notification-api.

À garantir : prix non fourni par le navigateur, stock atomique, compensation après paiement si stock impossible, expiration des paniers et remboursement.

### 4.7 Publication de contenu et notification

1. L'administrateur rédige une actualité dans teamManager et associe des médias.
2. La transaction persiste contenu + événement `NotificationOutboxEvent`.
3. Un ordonnanceur appelle `/api/internal/outbox/process` avec clé de service.
4. Le worker local appelle `notification-api` avec idempotency key.
5. notification-api résout audience, préférences et locale; met les livraisons en file.
6. Email/push/SMS sont envoyés et audités.
7. `ob` lit et rend immédiatement ou après revalidation le contenu publié.

### 4.8 Marketplace vendeur jusqu'au payout

1. Le vendeur s'inscrit/se connecte dans sellerPortal.
2. Le BFF crée le produit, variantes/images/stock dans marketplace-api.
3. Le vendeur soumet; le club examine dans teamManager.
4. Approbation → produit actif et visible dans le catalogue cible.
5. Checkout → commande globale puis sous-commandes vendeur et réservation de stock.
6. Paiement confirmé → vendeur notifié; préparation puis expédition.
7. L'acheteur peut demander un retour; décision et éventuel remboursement.
8. Après délai de réserve, le solde est éligible à un payout; paiement et rapprochement clôturent le cycle.

Le code couvre bien vendeur, produits, commandes, retours et payouts, mais l'intégration de checkout/paiement/remboursement doit être rendue explicite et testée de bout en bout.

---

## 5. Use cases transverses complets à automatiser

### UC-01 — Onboarding d'un nouveau club

- Créer les référentiels et l'équipe dans superadmin.
- Inviter deux administrateurs, accepter une invitation, rejouer le jeton (doit échouer).
- Vérifier création SSO, affiliation, rôle et isolation d'équipe.
- Configurer branding/contenu dans teamManager et vérifier rendu ob.
- Désactiver le compte dans superadmin/SSO et vérifier refus immédiat dans toutes les apps.

### UC-02 — Match réglementaire nominal

- Programmer match, convoquer joueurs, définir composition.
- Ouvrir feuille, contrôler joueurs, valider officiels.
- Ajouter but/carton/remplacement/blessure et vérifier live public.
- Signer/clôturer; vérifier immutabilité, statistiques et notifications.
- Ouvrir le vote arbinote après match et vérifier agrégat.

### UC-03 — Match avec litige et correction

- Ajouter réserve, clôturer, tenter une modification directe (refus).
- Réouvrir depuis superadmin, simuler indisponibilité matchsheet et reprise idempotente.
- Corriger événement, recueillir nouvelles signatures, reclôturer.
- Vérifier historique intégral et impact contrôlé sur statistiques/votes.

### UC-04 — Billetterie sous concurrence

- Deux clients achètent la dernière place simultanément : un seul succès.
- Répéter callback fournisseur et webhook : aucun double effet.
- Laisser une réservation expirer puis exécuter purge.
- Scanner deux fois en ligne, puis sur deux terminaux hors ligne et synchroniser.
- Tester mauvaise audience, QR altéré, billet remboursé et secret tourné.

### UC-05 — Boutique et paiement dégradé

- Créer produit/stock, commander et initialiser paiement.
- Fermer la page de retour; le webhook doit suffire.
- Couper teamManager au premier webhook; payment-api doit réessayer.
- Répéter l'événement, vérifier une commande/un débit de stock/une notification.
- Tester paiement accepté alors que stock devenu indisponible : compensation/remboursement.

### UC-06 — Marketplace multi-vendeur

- Deux vendeurs créent des produits; tenter IDOR entre vendeurs.
- Soumettre/modérer un produit via teamManager.
- Commander des articles des deux vendeurs, générer deux sous-commandes.
- Expédier séparément, retourner une seule ligne, calculer commissions et payouts.
- Vérifier qu'aucun vendeur ne voit données, adresse ou payout de l'autre.

### UC-07 — Notification multicanale

- Publier une actualité avec audience par catégorie.
- Dédupliquer deux événements identiques.
- Respecter locale, opt-out et canal indisponible.
- Simuler Redis/fournisseur en panne puis reprise, backoff et DLQ.
- Désabonner un email/bounce et invalider un push expiré.

### UC-08 — Révocation et panne SSO

- Se connecter avec MFA dans chaque audience.
- Déconnexion globale puis réutilisation de l'ancien cookie : refus partout.
- Couper SSO et vérifier le mode attendu par application sensible/publique.
- Tourner la clé/JWKS sans interrompre les sessions valides.

---

## 6. Backlog consolidé et priorisé

### P0 — sécurité, argent, intégrité

- [ ] Mettre en place des **tests E2E multi-projets** pour UC-01 à UC-08 dans une stack éphémère.
- [ ] Versionner les **contrats HTTP/événements** (OpenAPI/JSON Schema), générer clients/types et tests de compatibilité consommateur.
- [ ] Migrer le SSO vers **JWT asymétriques + JWKS + rotation**, définir les audiences et modes de révocation par application.
- [ ] Auditer automatiquement **RBAC, périmètre équipe/catégorie et IDOR** sur toutes les mutations.
- [ ] Rendre réessayables/idempotentes les sagas **superadmin↔SSO** et **superadmin↔matchsheet**.
- [ ] Industrialiser les **outbox workers** payment/teamManager : lease, concurrence, backoff, DLQ, replay et alertes.
- [ ] Garantir transactionnellement les **stocks** billet/boutique/marketplace sous concurrence.
- [ ] Ajouter **réconciliation paiement**, unicité des idempotency keys et vérification stricte montant/devise/signature/timestamp.
- [ ] Implémenter la vraie **synchronisation offline multi-scanner** et la gestion des conflits.
- [ ] Attribuer chaque modération arbinote à l'**ID admin réel** et rendre l'audit append-only.
- [ ] Ajouter concurrence/versionnement et preuves de signature à `matchsheet`.
- [ ] Interdire le provider SMS non implémenté en production.

### P1 — fiabilité, exploitation, conformité

- [ ] Définir un **owner par table** et empêcher les migrations concurrentes; exposer API ou modèles de lecture aux non-owners.
- [ ] Propager partout un **correlation/trace ID**; logs JSON, métriques RED, traces OpenTelemetry et dashboards SLO.
- [ ] Ajouter health/readiness séparés pour DB, Redis et dépendances, sans fuite de secrets.
- [ ] Centraliser secrets dans un coffre, rotation des clés service/webhook et inventaire des accès.
- [ ] Unifier les uploads dans un **service de médias/stockage objet** avec antivirus, quotas et nettoyage.
- [ ] Formaliser rétention, export et suppression RGPD des profils, empreintes, blessures, candidatures, scans et notifications.
- [ ] Compléter remboursements, transferts de billets, litiges, factures et rapprochement.
- [ ] Unifier les machines à états et historiques produit/commande/retour/payout.
- [ ] Remplacer les lectures DB live par **événements versionnés** et SSE/WebSocket résilient.
- [ ] Établir sauvegarde/restauration testée, RPO/RTO, migration blue/green et rollback.
- [ ] Mettre des limites distribuées par IP/utilisateur/service et protection anti-bot des formulaires/votes.

### P2 — qualité produit et maintenabilité

- [ ] Harmoniser versions Next/React/TypeScript, règles ESLint/format et gestion de workspace/lockfiles.
- [ ] Mutualiser modèles et utilitaires réellement communs sans partager directement les entités de persistence.
- [ ] Fixer des seuils de couverture par couche et ajouter tests d'accessibilité/visuels/performance.
- [ ] Compléter les parcours MFA, sessions appareils, OAuth et identité vendeur.
- [ ] Ajouter prévisualisation/version/rollback des templates de notification.
- [ ] Rendre les gros imports/exports asynchrones avec progression, rapport et reprise.
- [ ] Documenter dans le code les SLA, timeouts, retries et comportements dégradés de chaque client.
- [ ] Ajouter feature flags et stratégie de déploiement progressif pour changements transverses.

## 7. Matrice de tests recommandée

| Couche | Contrôle minimum | Cible |
|---|---|---|
| Entités/migrations | schéma vierge + upgrade depuis N-1 + rollback | chaque propriétaire de table |
| Services | règles, transitions, concurrence, erreurs | ≥ 80 % branches critiques |
| API | auth, validation, idempotence, pagination, IDOR | chaque endpoint mutation |
| Contrats | provider/consumer et compatibilité N/N-1 | chaque interaction HTTP/événement |
| E2E | UC-01…UC-08 | pipeline pré-merge nocturne puis obligatoire |
| Sécurité | SAST, dépendances, secrets, DAST, upload | chaque merge/release |
| Résilience | panne DB/Redis/SSO/fournisseur, latence, doublons | staging régulier |
| Charge | vote, dernière place, live, checkout, envoi audience | avant saison/événement |
| UX | a11y clavier/lecteur, RTL, responsive, offline | chaque application visible |

## 8. Critères de « terminé » globaux

Une fonctionnalité transverse n'est terminée que si :

- son owner et son contrat versionné sont identifiés;
- authentification, autorisation et isolation tenant sont testées;
- retry, idempotence, timeout et comportement en panne sont définis;
- les transitions et actions sensibles sont auditées avec auteur/correlation ID;
- métriques, alertes, runbook et procédure de replay/réconciliation existent;
- migration et rollback ont été exercés sur une copie réaliste;
- données personnelles, rétention et droit de suppression sont traités;
- un scénario E2E nominal et au moins un scénario dégradé passent automatiquement.

## 9. Conclusion

Le socle fonctionnel est riche et couvre presque toute la chaîne d'un club : identité, gouvernance, sport, média, supporter, billet, commerce, paiement et communication. La prochaine étape ne devrait pas être d'ajouter beaucoup d'écrans isolés, mais de fiabiliser les frontières : rendre chaque échange contractuel, idempotent, observable et réconciliable; clarifier l'ownership des données; puis démontrer les parcours complets par des tests multi-projets. C'est cette consolidation qui transformera les fonctionnalités déjà présentes en une plateforme exploitable sans divergence silencieuse.

# Roadmap fonctionnelle

## Contexte

Ce document liste le backlog produit/fonctionnel du dépôt `foot` (API-Football, notifications, PWA, espace supporter, boutique, sponsors, finance, RGPD). Il complète `manquants.md`, qui couvre l'infrastructure, la sécurité, la qualité et la gouvernance des données — la vraie dette technique bloquante.

---

# 1. Manques API-Football

## 1.1. Matching équipes/matchs à finaliser

### Constat

Le fichier `matching.md` identifie déjà le besoin : ne pas matcher les équipes uniquement par nom, mais utiliser des identifiants API-Football explicites.

### Recommandation

Ajouter :

- `Team.api_football_id` ;
- `Match.api_football_fixture_id` ;
- `Match.live_status` ;
- `Match.live_score_home` ;
- `Match.live_score_away` ;
- `Match.live_minute` ;
- `Match.live_updated_at`.

### Priorité

Haute.

---

## 1.2. Job de synchronisation live absent

### Recommandation

Créer un job qui :

1. récupère les matchs locaux du jour ;
2. appelle API-Football seulement pendant les fenêtres utiles ;
3. matche par `api_football_fixture_id` si disponible ;
4. sinon matche par date + IDs API des équipes ;
5. met à jour statut, score, minute ;
6. journalise succès/erreurs ;
7. protège le quota.

### Priorité

Haute.

---

## 1.3. Écran de mapping API-Football absent

### Recommandation

Ajouter dans `superadmin` :

- écran mapping équipes locales ↔ équipes API ;
- écran matching fixtures ;
- affichage conflits ;
- bouton resynchroniser ;
- historique de synchronisation.

### Priorité

Haute.

---

# 2. Manques notifications

## 2.1. Notifications centralisées à finaliser

### Constat

`teamManager` prévoit notifications PWA, email et in-app.

### Recommandation

Créer un vrai système :

- table `Notification` standardisée ;
- préférences utilisateur ;
- templates ;
- queue d'envoi ;
- retry ;
- statut livraison ;
- ciblage par club, catégorie, rôle, joueur, supporter ;
- historique ;
- push PWA ;
- emails.

### Événements à notifier

- match créé ;
- convocation envoyée ; ✅ câblé (`teamManager/src/app/admin/convocations/actions.ts`)
- changement d'horaire ;
- composition publiée ;
- feuille de match clôturée ; ✅ câblé (`matchsheet/src/app/[matchId]/post-match/actions.ts`)
- résultat final ;
- nouvelle actualité ; ✅ câblé (`teamManager/src/app/admin/news/actions.ts`)
- sponsor accepté ;
- commande payée ;
- anomalie vote détectée.

### Statut — première itération livrée (teamManager + matchsheet)

Fait :
- Table partagée `platform_notifications` (+ `notification_preferences`) — `db/foot.sql`, création idempotente dans `start.sh`, fichiers `sql/migration_add_platform_notifications.sql` dans les deux apps.
- `PlatformNotificationService` (créer/lister/marquer lu/préférences) dans `teamManager` et `matchsheet`, fan-out par utilisateur à la création.
- Canaux **in-app + email** (choix validé) : cloche + panneau déroulant dans le header, page complète `/admin/notification-center` (teamManager) et `/notification-center` (matchsheet), toggle préférence email par utilisateur.
- Email envoyé de façon synchrone via `sendEmailOrThrow` (nodemailer, réutilise `SMTP_HOST/PORT/USER/PASS/FROM`) ; statut de livraison tracé (`emailStatus`/`emailError`/`emailSentAt`) ; `retryFailedEmails()` permet de rejouer les échecs.
- 3 déclencheurs réels câblés (voir ci-dessus) à titre de preuve du pipeline ; le reste de la liste "Événements à notifier" reste à câbler au fil de l'eau.

Volontairement **hors scope** de cette itération (voir questions posées avant implémentation) :
- **Web Push** (notifications navigateur) — nécessiterait la génération de clés VAPID et un endpoint d'abonnement ; non fait, le choix retenu était in-app + email.
- **File d'attente / retry automatique** (BullMQ+Redis ou équivalent) — l'envoi reste synchrone avec un statut trackable et un retry manuel (`retryFailedEmails`), suffisant pour ce volume ; une vraie queue reste une évolution possible si le volume augmente.
- **Templates** d'email formatés (HTML actuellement généré inline, pas de moteur de templates séparé).
- **arbinote et superadmin** n'ont pas (encore) le système — périmètre limité à teamManager + matchsheet pour cette passe (choix validé).
- Ciblage avancé (par catégorie, rôle, joueur, supporter) — le ciblage actuel est club-entier (tous les ADMIN/OBSERVATEUR actifs du club) ; le filtrage plus fin reste à faire.

### Priorité

Haute.

---

# 3. Manques PWA

## 3.1. PWA complète côté `teamManager` et `matchsheet`

### Constat

La PWA est un objectif explicite du cahier des charges `teamManager`. `arbinote` et `superadmin` semblent avoir des fichiers PWA, mais `teamManager` et `matchsheet` doivent être complétés.

### Recommandation

Ajouter :

- `manifest.json` ; ✅ fait
- `sw.js` ; ✅ fait (cache network-first, exclut `/api/**`)
- icônes ; ✅ placeholders générés (192x192/512x512, à remplacer par un vrai logo)
- prompt d'installation ; ✅ fait (mêmes composants qu'arbinote, adaptés Bootstrap)
- stratégie offline ; ✅ basique (cache network-first avec fallback cache)
- cache assets ; ✅ basique (page racine + manifest + icône au install)
- notifications push ; ⬜ non fait (scope notifications de cette itération = in-app + email, pas push)
- tests Lighthouse. ⬜ non exécuté (pas d'environnement de build/preview disponible pendant cette itération)

### Priorité

Moyenne à haute.

---

# 4. Manques produit `teamManager`

## 4.1. Espace supporter / communauté incomplet

### Fonctionnalités attendues

- inscription supporter ;
- profil supporter ;
- commentaires ;
- votes homme du match ;
- sondages ;
- pronostics ;
- mur supporters ;
- encouragements ;
- points ;
- badges ;
- classement supporters ;
- contenus exclusifs ;
- QR présence stade.

### Priorité

Moyenne à haute.

---

## 4.2. Boutique e-commerce incomplète

### Fonctionnalités attendues

- panier ;
- checkout ;
- paiement ;
- webhook paiement ;
- commandes ;
- factures ;
- gestion stock ;
- livraison ;
- retrait stade ;
- retours ;
- remboursements ;
- codes promo ;
- avis produits ;
- billetterie.

### Priorité

Moyenne.

---

## 4.3. Sponsors : workflow contrat/facturation à compléter

### Fonctionnalités attendues

- pipeline sponsor ;
- validation/refus ;
- contrat ;
- dates début/fin ;
- montant ;
- niveau sponsor ;
- emplacements d'affichage ;
- statistiques visibilité ;
- renouvellement ;
- facturation.

### Priorité

Moyenne.

---

## 4.4. Finance / trésorerie à implémenter

### Fonctionnalités attendues

- cotisations joueurs ;
- échéanciers ;
- relances ;
- paiements ;
- dépenses ;
- justificatifs ;
- validation trésorier ;
- exports comptables ;
- rapports ;
- budget prévisionnel.

### Priorité

Haute si gestion réelle du club.

---

## 4.5. Juridique et RGPD à formaliser

### Fonctionnalités attendues

- consentements ;
- droit à l'image ;
- données mineurs ;
- données médicales ;
- export des données ;
- suppression/anonymisation ;
- registre de traitement ;
- contrats ;
- assurances ;
- archivage règlements.

### Priorité

Haute si données réelles ou mineurs.

---

# 5. Priorité recommandée

1. Mapping API-Football.
2. Job synchro live.
3. Notifications centralisées.
4. Espace supporter.
5. PWA complète.
6. Boutique complète.
7. Sponsors avancés.
8. Finance/trésorerie.
9. RGPD.

---

# 6. Checklist rapide

## API-Football

- [ ] `Team.api_football_id`
- [ ] `Match.api_football_fixture_id`
- [ ] Colonnes live match
- [ ] Écran mapping
- [ ] Job synchro
- [ ] Journal sync
- [ ] Quota monitoring

## Produit

- [x] Notifications centralisées — in-app + email, teamManager + matchsheet (web push, queue/retry auto et arbinote/superadmin restent à faire)
- [x] PWA `teamManager` — manifest/sw/icônes placeholder/install prompt (push + Lighthouse restent à faire)
- [x] PWA `matchsheet` — manifest/sw/icônes placeholder/install prompt (push + Lighthouse restent à faire)
- [ ] Espace supporter
- [ ] Gamification
- [ ] Boutique
- [ ] Paiement
- [ ] Sponsors avancés
- [ ] Finance
- [ ] RGPD

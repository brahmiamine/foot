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
- convocation envoyée ;
- changement d'horaire ;
- composition publiée ;
- feuille de match clôturée ;
- résultat final ;
- nouvelle actualité ;
- sponsor accepté ;
- commande payée ;
- anomalie vote détectée.

### Priorité

Haute.

---

# 3. Manques PWA

## 3.1. PWA complète côté `teamManager` et `matchsheet`

### Constat

La PWA est un objectif explicite du cahier des charges `teamManager`. `arbinote` et `superadmin` semblent avoir des fichiers PWA, mais `teamManager` et `matchsheet` doivent être complétés.

### Recommandation

Ajouter :

- `manifest.json` ;
- `sw.js` ;
- icônes ;
- prompt d'installation ;
- stratégie offline ;
- cache assets ;
- notifications push ;
- tests Lighthouse.

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

- [ ] Notifications centralisées
- [ ] PWA `teamManager`
- [ ] PWA `matchsheet`
- [ ] Espace supporter
- [ ] Gamification
- [ ] Boutique
- [ ] Paiement
- [ ] Sponsors avancés
- [ ] Finance
- [ ] RGPD

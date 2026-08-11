# skote — template d'admin (référence visuelle)

Copie vendored du template React **Skote** (Themesbrand, build Vite, package `skote_vite`) : un kit d'interface d'administration générique (tableaux de bord, e-commerce, chat, calendrier, emails, gestion de fichiers, factures, projets, tâches, blog, graphiques, tableaux de données, cartes, formulaires, authentification…). Ce n'est **pas une application du produit** — aucune autre app du dépôt n'importe de code depuis ce dossier, il n'est ni lancé ni buildé par [`../start.sh`](../start.sh).

## À quoi il sert

Uniquement de **référence de design** : `superadmin`, `matchsheet` et `teamManager` ont chacun porté à la main une partie de la feuille de style Skote (fichiers `skote-theme.scss`, classes `skote-admin`/`skote-content`) en la réduisant aux composants réellement utilisés et en remplaçant la palette générique par l'identité visuelle du club/de la ligue. Le code React de ce dossier lui-même n'est pas repris ; seul son thème CSS a inspiré les autres apps.

## Démarrage (pour consultation uniquement)

```bash
npm install
npm run dev
```

## Pistes si réutilisation future

Si une prochaine app du dépôt doit être scaffoldée avec une interface d'admin (tableaux de données, formulaires, graphiques), ce dossier reste une base de référence à consulter avant d'écrire un composant from scratch — mais toute réutilisation doit rester ciblée : porter uniquement les composants/styles nécessaires, comme cela a déjà été fait pour `superadmin`/`matchsheet`/`teamManager`, plutôt que d'importer directement les pages de démonstration.

# FOOT Design System

## Objectif

Le design system FOOT fournit une grammaire visuelle commune aux applications du monorepo sans imposer une apparence identique aux produits publics et aux interfaces métier.

La cohérence attendue porte en priorité sur :

- les couleurs de marque et couleurs sémantiques ;
- les surfaces, bordures, rayons et élévations ;
- les états interactifs et le focus clavier ;
- les comportements responsive et reduced-motion ;
- les primitives UI réutilisables ;
- la structure des shells pour les applications opérationnelles.

## Sources de vérité

### `src/index.css`

Tokens fondamentaux de la plateforme : marque, surfaces, texte, typographie, rayons, ombres et dimensions globales.

### `src/club-portal.css`

Thème partagé des portails opérationnels liés aux clubs :

- `player-hub`
- `medical-hub`
- `staff-hub`
- `seller-portal`
- `ticketing`

Les variables historiques préfixées par application (`--ph-*`, `--mh-*`, `--sh-*`, `--sp-*`, `--tk-*`) peuvent rester temporairement comme alias de compatibilité, mais leurs valeurs doivent provenir des tokens `--foot-portal-*`.

### `@foot/ui`

Primitives React partagées. Le socle actuel comprend :

- `Button`
- `Card`
- `Input`
- `Badge`
- `Alert`
- `PageHeader`

Lorsqu'une primitive existe dans `@foot/ui`, les nouveaux développements doivent la préférer à une nouvelle implémentation locale, sauf contrainte produit documentée.

### `@foot/app-shell`

Contrat partagé pour le branding et le comportement responsive des shells applicatifs. La migration des Sidebars, Topbars et navigations locales doit rester progressive afin de ne pas modifier les permissions ou les parcours métier pendant la consolidation visuelle.

## Familles d'interfaces

### Back-offices fédéraux

`federation-hub`, `match-operations` et l'administration de `club-hub` partagent une direction dashboard dense. Leur migration doit conserver les workflows Skote/Bootstrap existants tout en rapprochant progressivement les couleurs, la typographie et les primitives du design system FOOT.

### Portails club

`player-hub`, `medical-hub`, `staff-hub`, `seller-portal` et `ticketing` partagent le thème `club-portal.css`. Le branding dynamique d'un club peut remplacer les couleurs de marque, mais les métriques structurelles et les couleurs sémantiques restent cohérentes.

### Produits publics

`arbinote` et `club-ob` ont le droit de conserver une direction artistique distincte. Ils doivent néanmoins partager les règles d'accessibilité, de responsive, de motion et les tokens de marque pertinents lorsque cela ne dilue pas leur identité produit.

### Identity

`identity` reste volontairement plus minimal et sombre. Il doit conserver le même rouge de marque et les mêmes standards de focus, contraste et i18n que le reste de la plateforme.

## Règles de contribution

1. Ne pas ajouter une nouvelle couleur de marque dans un `globals.css` d'application si un token partagé existe.
2. Ne pas dupliquer un ensemble complet de surface/radius/shadow entre applications.
3. Préserver les variables locales pendant une migration uniquement comme alias vers un token partagé.
4. Les interfaces doivent rester utilisables en FR et AR, y compris RTL.
5. Toute animation doit respecter `prefers-reduced-motion`.
6. Les contrôles interactifs doivent conserver un état `focus-visible` perceptible.
7. Les cartes ne doivent pas accumuler par défaut bordure décorative et grande ombre diffuse.
8. Les changements de design system doivent être vérifiés au minimum par `pnpm design:check`, puis par typecheck/lint/build des applications touchées.

## Validation automatique

La commande :

```bash
pnpm design:check
```

vérifie actuellement :

- le chargement du thème partagé par les portails club ;
- l'absence des principales valeurs de thème dupliquées dans leurs `globals.css` ;
- la cohérence du fallback de branding de `seller-portal` ;
- la présence des primitives requises dans `@foot/ui` ;
- la présence des tokens essentiels du thème portal.

Cette validation est exécutée dans la CI avec les contrôles d'architecture frontend.

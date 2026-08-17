# player-hub

Espace joueur générique multi-clubs : un joueur consulte son calendrier, répond
à ses convocations et invitations d'entraînement, suit ses statistiques, sa
discipline, ses déplacements, sa disponibilité et ses notifications — le tout
en lisant les données déjà gérées par [`club-hub`](../club-hub) (même base
"foot"), sans les redéfinir.

## Périmètre de cette implémentation

`player-hub` fait partie des trois interfaces spécialisées présentes à côté de
`club-hub` : `player-hub`, `staff-hub` et `medical-hub`.

Cette application inclut :

- le rôle `PLAYER` dans `identity`, scopé à un club **et** à un joueur via `User.playerId` ;
- le claim `playerId` dans le JWT SSO partagé ;
- une page de connexion dédiée `identity` → `/joueur/login` ;
- la lecture des données déjà possédées par Club Hub et l'écriture strictement
  limitée aux réponses du joueur connecté sur ses propres lignes.

## Provisionnement d'un compte joueur

Un compte `PLAYER` est **provisionné par le club**, jamais en auto-inscription.

Le flux administré est désormais :

```text
club-hub / fiche joueur
  → admin du club saisit l'email personnel
  → appel service-to-service vers Identity
  → Identity crée/réutilise un compte PLAYER INACTIF lié au teamId + playerId
  → Identity génère une invitation hashée, expirable et à usage unique
  → email /activate-account?token=...
  → le joueur choisit lui-même son mot de passe
  → Identity active le compte
  → connexion /joueur/login
```

Le club ne connaît et ne génère jamais de mot de passe temporaire. Une
réinvitation invalide les anciens liens non utilisés. Un compte déjà actif ne
peut pas recevoir une nouvelle invitation d'activation.

Le script historique `identity/scripts/create-player-account.ts` reste utile
pour les environnements techniques/backfills, mais n'est plus le parcours
fonctionnel principal.

## Démarrage local

```bash
cp .env.example .env.local
pnpm install
pnpm dev   # http://localhost:3007
```

Nécessite `identity` démarré pour l'émission/vérification SSO. Pour le
provisionnement depuis Club Hub, `club-hub` doit configurer
`IDENTITY_SERVICE_URL` et `IDENTITY_SERVICE_API_KEY`; Identity doit configurer
la même clé via `SSO_SERVICE_API_KEY` et son SMTP.

`notifications` est optionnel pour la page notifications du portail.

## Design

Même palette/tokens que `seller-portal` (`--ph-*` dans `src/app/globals.css`)
plutôt que le Bootstrap/Skote de `club-hub`. Les couleurs de marque sont
résolues dynamiquement depuis `team_branding`, jamais hardcodées à un club.

Voir [`../docs/platform-capabilities.md`](../docs/platform-capabilities.md) et
[`../platform-governance-roadmap.md`](../platform-governance-roadmap.md).

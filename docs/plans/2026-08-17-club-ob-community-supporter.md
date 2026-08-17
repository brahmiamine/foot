# Club OB — Community Supporter implementation plan

**Goal:** transformer `club-ob` en hub supporter interactif avant, pendant et après les matchs, sans dupliquer les responsabilités de `identity`, `ticketing`, `notifications`, `marketplace` ou `match-operations`.

## Architecture retenue

- `club-ob` : expérience publique + interactions du compte SSO `MEMBER`.
- `club-hub` : propriétaire du schéma `cms_supporter_*`, modération et animation éditoriale.
- `identity` : identité et profil membre.
- `ticketing` : présence réelle au stade via billet `USED` non révoqué.
- `match-operations` : composition et événements de match utilisés pour l'éligibilité homme du match et le premier buteur.
- `notifications` : canal existant conservé pour les notifications/push.
- `marketplace` : commandes non dupliquées dans `club-ob`; l'API de listing membre reste à exposer côté marketplace avant branchement.

## Invariants de sécurité

- toutes les mutations supporter exigent explicitement `session.role === "MEMBER"` ;
- toutes les écritures et lectures sont scopées par `team_id` ;
- SQL paramétré exclusivement ;
- un pronostic est verrouillé au coup d'envoi ;
- homme du match : joueur titulaire ou remplaçant effectivement entré ;
- publications et commentaires supporter : `PENDING` avant publication ;
- limites anti-spam : 3 posts/jour et 5 commentaires/10 minutes par membre ;
- image supporter : URL HTTPS uniquement, rendue sans referrer ;
- points idempotents par `source_key` unique ;
- aucune donnée d'identité technique (`user_id`) n'est exposée publiquement ;
- le supporter du mois dépend des points d'engagement positifs, jamais du montant dépensé ;
- les Server Actions n'acceptent que des chemins de retour internes explicitement autorisés.

## Fonctionnalités

- [x] page publique `/communaute` ;
- [x] pronostics score + premier buteur ;
- [x] vote homme du match ;
- [x] sondages ;
- [x] réactions ❤️ 🔥 👏 😢 ;
- [x] commentaires modérés ;
- [x] mur supporters avec modération ;
- [x] publications officielles réservables aux membres ;
- [x] profil supporter, joueur et tribune favoris ;
- [x] présence automatique depuis `tk_tickets.status = USED` ;
- [x] points de fidélité idempotents ;
- [x] badges ;
- [x] classement supporters ;
- [x] supporter du mois ;
- [x] groupes supporters et événements ;
- [x] réactions/commentaires sous les actualités ;
- [x] back-office de modération dans `club-hub` ;
- [x] audit des décisions de modération/animation ;
- [x] FR/AR sur les nouvelles interfaces communautaires ;
- [x] navigation publique et onglet membre ;
- [x] contrôle strict du rôle `MEMBER` sur l'espace membre historique.

## Barème initial

- présence à un match via billet scanné : **+100** ;
- participation à un pronostic : **+5** ;
- bon résultat : **+20** ;
- score exact : **+30** supplémentaires ;
- premier buteur exact : **+30** ;
- vote homme du match : **+5** ;
- vote à un sondage : **+5** ;
- publication supporter approuvée : **+10** ;
- commentaire approuvé : **+2** ;
- profil supporter complété : **+10**.

Les récompenses commerciales (remises boutique, priorité de billetterie, cadeaux) devront être matérialisées comme avantages configurables avant de pouvoir consommer des points. Aucun avantage financier n'est simulé dans ce lot.

## Vérification attendue

- `club-ob`: Vitest, ESLint, build Next.js ;
- `club-hub`: tests/lint/build applicables au projet ;
- audit de sécurité du diff : auth, scoping, injection, XSS, redirections, abus et confidentialité ;
- CI GitHub verte avant passage de la PR en ready-for-review.

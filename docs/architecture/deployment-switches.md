# Activation progressive des frontières HTTP

Les adapters shared-DB sont uniquement des ponts de migration. Chaque composition root publie maintenant un log structuré lors de son choix :

```json
{"event":"domain_boundary_adapter","boundary":"match-operations->club-lineup","mode":"http"}
```

Le champ `mode` vaut `http` ou `shared-db`. Ces logs permettent de vérifier qu'un environnement a réellement basculé avant de supprimer les adapters historiques.

## Règle générale

Pour toutes les frontières de migration :

- URL + clé absentes → adapter shared-DB de transition ;
- URL + clé présentes → client HTTP typé ;
- une seule valeur présente → erreur de configuration ;
- `DOMAIN_BOUNDARY_REQUIRE_HTTP=true` + URL/clé absentes → **erreur fail-closed**, le fallback shared-DB est interdit ;
- les variables déjà utilisées par un autre workflow ne doivent jamais servir implicitement de feature switch à une nouvelle frontière.

`DOMAIN_BOUNDARY_REQUIRE_HTTP=false` reste la valeur de transition dans les `.env.example`. Pour un environnement migré, passer cette valeur à `true` seulement après avoir configuré toutes les paires URL/clé consommées par l'application.

## Fédération → Club : faits joueur réglementaires

Cette frontière utilise volontairement des variables dédiées :

```env
CLUB_PLAYER_FACTS_URL=
CLUB_PLAYER_FACTS_SERVICE_API_KEY=
```

Elles ne doivent pas être remplacées par `CLUB_HUB_URL` / `CLUB_HUB_SERVICE_API_KEY`, déjà utilisées par la saga d'annulation/report de match.

Déploiement sûr :

1. déployer `club-hub` avec `/api/internal/regulatory/player-facts` ;
2. déployer `federation-hub` en laissant `CLUB_PLAYER_FACTS_*` vides : l'adapter shared-DB reste actif et le log doit afficher `mode=shared-db` ;
3. configurer `CLUB_PLAYER_FACTS_URL` et `CLUB_PLAYER_FACTS_SERVICE_API_KEY` ensemble ;
4. vérifier les décisions d'éligibilité et le log `mode=http` ;
5. quand **toutes** les frontières de l'application sont en HTTP, positionner `DOMAIN_BOUNDARY_REQUIRE_HTTP=true` ;
6. supprimer ensuite les adapters shared-DB devenus inatteignables dans une PR dédiée.

## Frontières concernées par le garde global

- `match-operations` → réglementation Fédération, disponibilités arbitres, compositions Club ;
- `federation-hub` → disponibilités arbitres et faits joueur Club ;
- `club-hub` → Identity ;
- `referee-hub` → Identity ;
- `staff-hub` / `medical-hub` → RBAC Club.

Le garde global est volontairement simple : il ne remplace pas les tests de connectivité ni les probes de santé. Il empêche seulement qu'une configuration censée être totalement migrée recommence silencieusement à lire une table appartenant à un autre domaine.

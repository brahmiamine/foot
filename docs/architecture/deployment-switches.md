# Activation progressive des frontières HTTP

Les adapters shared-DB restent le comportement de transition tant qu'une frontière n'est pas explicitement activée. Pour chaque frontière, une configuration partielle est refusée (`fail-closed`).

## Fédération → Club : faits joueur réglementaires

Cette frontière utilise volontairement des variables dédiées :

```env
CLUB_PLAYER_FACTS_URL=
CLUB_PLAYER_FACTS_SERVICE_API_KEY=
```

Elles ne doivent pas être remplacées par `CLUB_HUB_URL` / `CLUB_HUB_SERVICE_API_KEY`, car ces dernières sont déjà utilisées par la saga d'annulation/report de match. Cette séparation permet un rolling deploy sûr :

1. déployer `club-hub` avec `/api/internal/regulatory/player-facts` ;
2. déployer `federation-hub` en laissant `CLUB_PLAYER_FACTS_*` vides : l'adapter shared-DB reste actif ;
3. configurer `CLUB_PLAYER_FACTS_URL` et `CLUB_PLAYER_FACTS_SERVICE_API_KEY` ensemble ;
4. vérifier les décisions d'éligibilité ;
5. supprimer ultérieurement l'adapter shared-DB une fois tous les environnements basculés.

La valeur de `CLUB_PLAYER_FACTS_SERVICE_API_KEY` peut correspondre à la clé que `club-hub` valide via `CLUB_HUB_SERVICE_API_KEY`; le nom côté consommateur est distinct afin que l'activation soit explicite.

## Règle générale

Pour toutes les frontières de migration :

- URL + clé absentes → adapter shared-DB de transition ;
- URL + clé présentes → client HTTP typé ;
- une seule valeur présente → erreur de configuration ;
- les variables déjà utilisées par un autre workflow ne doivent pas servir implicitement de feature switch à une nouvelle frontière.

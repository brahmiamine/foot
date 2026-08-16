# Federal Operations V3

Ce lot complète les processus fédéraux qui restent hors transfert international / ITC / FIFA TMS.

## Domaines

- commissions fédérales : membres, séances, présence, quorum, délibération, décision, signature et notification ;
- extension du cycle réglementaire annuel : campagnes assurance, subventions et conformité documentaire, état de préparation et finalisation ;
- assurances club/personnes ;
- subventions et paiements référencés ;
- redistribution des droits média ;
- indemnités de formation ;
- mécanisme de solidarité ;
- exigences et versions documentaires ;
- sélections nationales / DTN : équipes, événements et convocations.

## Principes de sécurité

- scope serveur `PLATFORM_SUPERADMIN` / `FEDERATION_ADMIN` / `LEAGUE_ADMIN` ;
- permissions réglementaires fines ;
- audit avec utilisateur, rôle, IP, User-Agent, ancienne/nouvelle valeur et motif ;
- quorum recalculé depuis les présences et membres votants stockés ;
- aucune décision possible sans délibération et quorum ;
- décision immuable après signature ;
- montants média recalculés côté serveur ;
- les paiements conservent une référence externe, sans simuler un PSP ;
- les documents doivent utiliser HTTPS ou un chemin interne ;
- aucune intégration FIFA TMS/ITC n'est introduite dans ce lot.

## Migration

Appliquer `federation-hub/mysql/migration_add_federal_operations_v3.sql` via le manifeste global avant activation des routes V3.

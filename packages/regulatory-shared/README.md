# regulatory-shared

Ce dossier contient uniquement les règles métier pures communes aux workflows
réglementaires de `federation-hub` et `club-hub`. Il ne s'agit pas d'une
application ni d'un service déployable.

Le premier module, `src/clubLicensing.ts`, définit la machine d'états de la
licence club et les invariants d'approbation. Les contrôles d'identité et de
périmètre restent obligatoirement exécutés côté serveur dans chaque
application appelante.

`src/personLicensing.ts` définit la machine d'états des licences individuelles,
leur activité réglementaire et les métadonnées requises à l'approbation.

`src/playerRegistration.ts` définit le workflow d'enregistrement d'un joueur
et la projection déterministe de son statut d'éligibilité.

`src/playerContract.ts` définit les cycles métier et fédéral des contrats
joueurs, les invariants de dates, de soumission et d'homologation.

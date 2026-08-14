# regulatory-shared

Ce dossier contient uniquement les règles métier pures communes aux workflows
réglementaires de `federation-hub` et `club-hub`. Il ne s'agit pas d'une
application ni d'un service déployable.

Le premier module, `src/clubLicensing.ts`, définit la machine d'états de la
licence club et les invariants d'approbation. Les contrôles d'identité et de
périmètre restent obligatoirement exécutés côté serveur dans chaque
application appelante.

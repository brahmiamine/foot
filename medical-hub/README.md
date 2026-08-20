# medical-hub

Espace médical privé du club : blessures, indisponibilités, suivi clinique,
Return-to-Play, clearances, documents, historique et paramètres médicaux. Les
données cliniques restent dans le domaine médical et ne sont jamais exposées
aux rôles techniques ou administratifs généraux.

## Contrôle d'accès médical

`medical.view` autorise la lecture du dossier médical dans le périmètre de
catégorie du compte. CLUB-013 sépare ensuite les mutations par capacité :

- `medical.injuries.manage` : créer/modifier le dossier de blessure et le diagnostic ;
- `medical.followups.manage` : ajouter des entrées au journal médical append-only ;
- `medical.rtp.manage` : faire progresser le workflow Return-to-Play ;
- `medical.clearance.manage` : enregistrer une décision de clearance ;
- `medical.documents.manage` : ajouter des références de documents médicaux ;
- `medical.settings.manage` : administrer les règles médicales globales du club.

La clé historique `medical.manage` est conservée comme alias de compatibilité
pour les rôles personnalisés existants. Les nouvelles attributions doivent
utiliser les permissions fines.

Toutes les Server Actions revalident la permission, le `teamId` et, pour une
ressource joueur/blessure, la catégorie autorisée. Une URL ou un identifiant de
blessure deviné ne permet donc pas de sortir du périmètre du rôle. Les paramètres
médicaux sont club-wide et exigent une portée globale.

## Presets Club Hub

Club Hub fournit trois presets médicaux distincts :

| Preset | Portée | Capacités principales |
| --- | --- | --- |
| **Kiné** | catégorie | lecture, suivi thérapeutique, progression RTP |
| **Médecin** | catégorie | diagnostic/blessure, suivi, RTP, documents, clearance |
| **Responsable médical** | globale | toutes les capacités précédentes + paramètres médicaux du club |

Le preset historique `Staff médical` n'est pas supprimé automatiquement afin de
ne pas casser les attributions existantes. La migration CLUB-013 crée seulement
les trois nouveaux presets manquants ; elle n'écrase aucun rôle personnalisé.

Le preset `Secrétaire Général`, les rôles Coach/Adjoint et les autres rôles non
médicaux n'obtiennent aucune permission `medical.*` par défaut.

## Architecture et confidentialité

`medical-hub` consomme la projection RBAC possédée par Club Hub via le port de
domaine prévu à cet effet. Les rôles directs temporaires, révocations et
délégations CLUB-012 sont pris en compte dans cette projection.

`player-hub` et `staff-hub` ne doivent consommer qu'un statut opérationnel
simplifié quand nécessaire (par exemple disponible/indisponible), jamais le
diagnostic, les notes cliniques ou les documents médicaux.

Le journal médical (`InjuryFollowUp`) est append-only. Le workflow Return-to-Play
est structuré : `INJURED → TREATMENT → INDIVIDUAL → PARTIAL → FULL → CLEARANCE → AVAILABLE`
(selon la policy de clearance). Les décisions de clearance sont historisées et
les paramètres de second avis sont appliqués côté serveur.

## Provisionnement

Un compte médical reste un compte staff club standard authentifié via Identity.
L'administrateur du club assigne ensuite depuis Club Hub le preset adapté :
Kiné, Médecin ou Responsable médical. Les presets Kiné/Médecin peuvent être
attribués par catégorie ; Responsable médical est global.

## Démarrage local

```bash
cp .env.example .env.local   # puis renseigner DB_*, SSO_URL, NOTIFICATION_API_URL
pnpm install
pnpm dev   # http://localhost:3012
```

## Stockage documentaire

La gestion métier des références documentaires est présente. Le stockage objet,
le chiffrement, l'antivirus, les URLs signées et l'audit d'accès renforcé restent
suivis séparément par `MED-005` dans `platform-governance-roadmap.md`.

## Design

Même système que `player-hub`/`staff-hub`/`seller-portal` (`--mh-*` dans
`src/app/globals.css`).

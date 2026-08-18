# FOOT — Platform Capabilities

> Document canonique de statut fonctionnel du monorepo.
>
> Pour savoir si une capacité existe **aujourd'hui**, utiliser ce fichier avec le code de `main` et le README du domaine concerné. Les fichiers de migration historiques décrivent aussi l'histoire d'implémentation et peuvent contenir des bilans intermédiaires devenus obsolètes après des PR ultérieures.

## Légende

- `IMPLEMENTED` : parcours réellement présent dans le code.
- `PARTIAL` : fondation/parcours présent mais limitation explicite restante.
- `PLANNED` : suivi dans `platform-governance-roadmap.md`, pas encore livré.
- `DEPRECATED` : ancien parcours conservé uniquement pour compatibilité ou explicitement désactivé.

## Snapshot

- Référence de départ de la roadmap gouvernance : `main` après merge de PR #93 (`7e3dd3194dbbd52f15f5ab84d81b692a979b7de5`).
- Backlog et preuves de validation des améliorations de gouvernance : [`../platform-governance-roadmap.md`](../platform-governance-roadmap.md).
- Ce document est ré-aligné à chaque lot clôturé ; une capacité n'est qualifiée `IMPLEMENTED` qu'avec code serveur réel et gates de validation correspondants.

## Applications et services

| Domaine | Statut | Capacités actuelles | Limites / prochain axe |
|---|---|---|---|
| `identity` | IMPLEMENTED | SSO RS256/JWKS, reset password, affiliations, rôles/scopes, révocation globale, provisionnement PLAYER par invitation, policy MFA par rôle et step-up MFA pour actions sensibles | modes d'inscription MEMBER, gestion fine appareils/sessions et accès temporaires PLANNED |
| `federation-hub` | IMPLEMENTED | référentiels, arbitrage privé, licensing, registrations, contrats, transferts, sanctions, litiges, appels, cycles saisonniers, finance, gouvernance, stades, qualifications, médical fédéral, agents, console plateforme des remboursements manuels Payments, Regulatory Policy Center (résolution hiérarchique PLATFORM→FEDERATION→LEAGUE→SEASON, délégation fédération→ligue par opération, commission réellement obligatoire selon policy sur discipline/appels/licences club), assurances avec expiration effective et exigence par compétition, subventions avec justificatifs documentaires obligatoires, droits média et indemnités formation/solidarité réglables paid/disputed, SLA réglementaires par domaine avec file overdue, mode de migration permissions LEGACY/WARN/ENFORCE | moteur de rappels/escalade SLA planifié (BullMQ) reste `GOV-008` ; revue club en libre-service des droits média contestés PLANNED |
| `club-hub` | IMPLEMENTED | administration club, effectif, staff, sport, contenu, academy, recrutement, sponsors, ticketing admin, marketplace admin, dossier fédéral, maker/checker, workflows News/Communiqués et approbation produits | public forms settings, candidatures/recrutement enrichis, sponsoring/déplacements et autres policies P1 PLANNED |
| `player-hub` | PARTIAL | portail PLAYER, calendrier, réponses, statistiques, discipline, déplacements, disponibilité, notifications, compte PLAYER provisionnable par invitation depuis Club Hub | disponibilité structurée enrichie, portefeuille documentaire, consentements et demandes administratives PLANNED |
| `staff-hub` | IMPLEMENTED | portail staff opérationnel sur les données/RBAC Club Hub, composition DRAFT→PROPOSED→APPROVED→LOCKED avec proposition adjoint et approbation coach | verrouillage configurable avant coup d'envoi, validation entraînement, stats post-match et délégation HEAD_COACH PLANNED |
| `medical-hub` | IMPLEMENTED | blessures, indisponibilités, documents, permissions médicales strictes, journal append-only, Return-to-Play structuré, clearance configurable et tests de non-divulgation | stockage objet/chiffrement/antivirus et politique de rétention PLANNED |
| `referee-hub` | IMPLEMENTED | désignations, historique, indisponibilités, rapports privés, accès feuille, acceptation/refus de désignation et demandes de remplacement revues par la Fédération | policies d'indisponibilité/rapports, conflits d'intérêts, désignation auto/suggested et grilles versionnées PLANNED |
| `arbinote` | IMPLEMENTED | perception publique des arbitres, votes protégés, statistiques, modération séparée | voting policies, seuil de visibilité et versionnement critères PLANNED |
| `match-operations` | IMPLEMENTED | feuille électronique, contrôles, live, signatures, éligibilité serveur, staff officiel, protocole match configurable, amendement explicite post-signature et policy de correction versionnée | offline PWA complet reste PARTIAL/PLANNED |
| `ticketing` | IMPLEMENTED | vente, paiement, QR, scan online/offline, révocation, remboursements/reconciliation, audience STRICT/DECLARATIVE, workflow DRAFT→REVIEW→APPROVED→SCHEDULED→OPEN et revalidation tarifaire | invitations/gratuits, gestion appareils scanner, policy d'entrée, transfert billets et offres avancées PLANNED |
| `marketplace` | IMPLEMENTED | catalogue multi-vendeur, modération, stock, checkout, commandes, retours, payouts, seller applications/settings | ledger payout/settlement avancé PARTIAL |
| `seller-portal` | IMPLEMENTED | portail privé vendeur, activation par invitation, produits, stock, commandes, retours, payouts | accès DB local historique encore en transition vers Marketplace comme source unique |
| `payments` | IMPLEMENTED | Konnect/Paymee/Flouci, idempotence, routing policy par consommateur, refunds, seuils AUTO/SINGLE/DUAL avec maker/checker, `MANUAL_REVIEW`, reconciliation opérateur, SLA/reminders/escalations idempotents et dashboard plateforme | ledger financier détaillé (`PAY-004`) et réconciliation provider/interne avec file d'écarts (`PAY-005`) PLANNED ; moteur SLA transversal commun suivi par `GOV-008` |
| `notifications` | IMPLEMENTED | in-app/email/push, préférences, templates, BullMQ, idempotence, cible ROLE utilisée par les escalades Payments | policies organisationnelles/digest/quiet hours PLANNED ; SMS non implémenté |
| `club-ob` | IMPLEMENTED | site public OB, espace membre, contenus, boutique, seller application public entry point | Public Forms policy centralisée et membership tiers PLANNED |

## Seller onboarding canonique

Depuis la PR #93, le flux vendeur est :

```text
club-ob (demande publique)
        ↓
marketplace / seller application
        ↓
club-hub (revue selon settings)
        ↓
Seller + SellerUser INVITED
        ↓
email avec jeton à usage unique / expiration
        ↓
seller-portal /activate
        ↓
SellerUser ACTIVE
```

Règles actuelles :

- l'inscription vendeur directe depuis `seller-portal` est désactivée ;
- `POST marketplace/auth/register` est conservé comme endpoint de compatibilité mais renvoie `410 Gone` ;
- aucun mot de passe candidat n'est créé au dépôt de demande ;
- le mot de passe est choisi lors de l'activation ;
- les settings club gouvernent approbation vendeur et produit ;
- une modification sensible d'un produit publié peut imposer une nouvelle validation.

## Source de vérité réglementaire

`migration-v2.md` reste la spécification et l'historique de migration, mais ses bilans intermédiaires ne doivent pas être utilisés seuls pour conclure qu'une capacité est absente. Toujours vérifier :

1. le code de `main` ;
2. le README actuel de `federation-hub`, `club-hub`, `match-operations`, `payments` ou du domaine concerné ;
3. les migrations versionnées du propriétaire de données et, pour le schéma partagé, celles enregistrées dans `db/migrations.manifest` ;
4. ce document de statut.

La migration Federal Operations V3 prépare notamment commissions, assurances, subventions, droits TV, indemnités de formation, solidarité et contrôle documentaire. Une table/migration seule ne suffit pas à qualifier une capacité de `IMPLEMENTED` : il faut aussi workflow serveur, autorisation, UI/intégration si le domaine l'exige, et tests.

## Règles pour les agents de développement

- Ne jamais recréer un domaine uniquement parce qu'un ancien bilan Markdown le marque incomplet.
- Chercher d'abord son propriétaire actuel et les callers réels.
- Une feature flag ou un setting UI ne remplace jamais une garde serveur.
- Les identifiants de tenant (`teamId`, `federationId`, `leagueId`) sont dérivés du contexte authentifié côté serveur.
- Les décisions sensibles doivent être motivées et auditables.
- Après chaque implémentation, mettre à jour ce fichier si le statut d'une capacité change, puis mettre à jour `platform-governance-roadmap.md` avec la preuve de validation.
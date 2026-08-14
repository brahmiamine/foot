# `db` — instantané de la base partagée `foot`

Ce dossier est un composant **non déployable**. [`foot.sql`](./foot.sql) est un
dump MariaDB de référence pour amorcer le développement local ; ce n'est ni un
migrateur ni la source exhaustive du schéma courant. Les migrations
incrémentales restent réparties dans les projets. Les droits d'écriture et la
procédure cross-app sont dans [`OWNERSHIP.md`](./OWNERSHIP.md).

## Périmètre des bases

| Base | Projets / accès | Tables |
|---|---|---|
| **`foot` partagée** | `arbinote`, `match-operations`, `federation-hub`, `club-hub`, `identity`, `seller-portal`, `ticketing`; `ob` en lecture | Référentiel, matchs, arbitrage, comptes, effectif, CMS, feuille de match, ticketing et marketplace (`sp_*`). |
| **base propre à `payments`** (`DB_DATABASE`) | `payments` seulement | `payments`. Aucune table de paiement n'appartient à `foot`. |
| **base propre à `notifications`** (`DB_DATABASE`) | `notifications` seulement | `notifications`, `notification_deliveries`, `notification_events`, `notification_preferences`, `notification_user_locales`, `notification_templates`, `push_subscriptions`. |

`notifications` ouvre en plus une connexion **lecture seule** vers `foot`
(`DIRECTORY_DB_*`) pour résoudre des destinataires ; cela ne transfère aucune
de ses tables dans la base partagée.

## Comparaison du dump avec les migrations actuelles

Le dump contient exactement les 23 tables suivantes (noms et casse conservés) :

```text
arbitres, AuditLog, audit_logs, Card, CardReason, contact_messages,
Convocation, critere_definitions, federations, Fine, journees, ligues,
matches, Note, Player, saisons, Settings, Suspension, teams, User, votes,
vote_alerts, _prisma_migrations
```

La comparaison avec les scripts présents montre qu'il est **en retard** :

| Projet / emplacement | Écart par rapport à `foot.sql` |
|---|---|
| `arbinote/migrations`, `arbinote/mysql` | Les tables historiques d'arbitrage sont dans le dump ; des évolutions de colonnes/index de `federations`, `ligues`, `teams`, `saisons`, `votes` peuvent rester à appliquer. |
| `federation-hub/migrations`, `federation-hub/mysql` | `team_branding` et `staff_invitations` manquent au dump ; les migrations modifient aussi `matches` et les tables référentielles/arbitrage. |
| `identity/sql` | `member_team_affiliations`, `password_reset_tokens`, `security_events` et `mfa_enrollment_challenges` manquent ; plusieurs claims/profils/MFA modifient `User`. |
| `match-operations/sql` | Toutes les tables `ms_*` manquent : `ms_sheets`, `ms_signatures`, `ms_goals`, `ms_injuries`, `ms_substitutions`, `ms_reservations`, `ms_match_officials`, `ms_player_controls`; les scripts modifient aussi `Card`. |
| `club-hub/sql` | Les tables `cms_*` et `shop_*` issues des migrations courantes manquent presque toutes, ainsi que leurs évolutions de `Player`, `Card`, `teams` et `matches`. `olympique_beja_db_complete.sql` est un ancien schéma/bootstrap, pas la liste canonique à fusionner aveuglément. |
| `ticketing/sql` | `tk_ticket_categories`, `tk_match_ticket_categories`, `tk_ticket_sale_rules`, `tk_tickets` et `tk_ticket_scans` manquent. |
| `seller-portal/sql` | Toutes les tables marketplace `sp_*` manquent (vendeurs, utilisateurs, catégories, produits/images/variantes, stocks, commandes/lignes, retours, payouts, notifications). |
| `payments`, `notifications` | Aucun dossier de migrations versionnées. Les entités TypeORM créent leurs tables dans leurs **bases propres** avec `synchronize` hors production ; ce mécanisme ne doit jamais servir à compléter `foot`. |

Ainsi, la rubrique ne prétend pas que les 23 tables du dump représentent la
production. Pour connaître le schéma attendu, lire ensemble le dump, les
scripts ci-dessus et les entités actuelles. Une installation locale est gérée
par [`../start.sh`](../start.sh) (MariaDB sur le port 3307), mais les projets
déployés séparément peuvent nécessiter l'application manuelle de leurs scripts.

## Domaines fonctionnels de `foot`

- **Référentiel et compétition** : `federations`, `ligues`, `saisons`,
  `journees`, `teams`, `team_branding`, `matches`.
- **Arbitrage** : `arbitres`, `votes`, `vote_alerts`,
  `critere_definitions`, `audit_logs`.
- **Identité partagée** : `User`, `member_team_affiliations`,
  `password_reset_tokens`, `security_events`, `mfa_enrollment_challenges`,
  `staff_invitations`.
- **Effectif et discipline** : `Player`, `Card`, `CardReason`, `Suspension`,
  `Fine`, `Note`, `Convocation`.
- **Club et feuille de match** : familles `cms_*`, `shop_*` et `ms_*`.
- **Billetterie partagée** : famille `tk_*`.
- **Marketplace partagée (état actuel)** : famille `sp_*`. Elle reste dans
  `foot` tant qu'une Marketplace API et sa base dédiée n'existent pas.

Les noms `notifications` ou `payments` rencontrés dans d'anciens scripts de
bootstrap ne doivent pas être confondus avec les tables courantes des deux API
isolées : c'est la configuration `DB_DATABASE` du service qui fixe leur base.

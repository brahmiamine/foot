import { Entity, PrimaryColumn } from "typeorm";

/**
 * Copie en lecture seule de `member_team_affiliations` (gérée dans `sso`,
 * voir sso/src/entities/MemberTeamAffiliation.ts). Consommée uniquement
 * pour évaluer une TicketSaleRule à audience HOME_SUPPORTERS/AWAY_SUPPORTERS
 * — jamais pour restreindre un achat en dehors de ce cas explicite (voir
 * README racine, section « Billetterie »).
 */
@Entity("member_team_affiliations")
export class MemberTeamAffiliation {
  @PrimaryColumn({ type: "varchar", length: 191, name: "user_id" })
  userId!: string;

  @PrimaryColumn({ type: "char", length: 36, name: "team_id" })
  teamId!: string;
}

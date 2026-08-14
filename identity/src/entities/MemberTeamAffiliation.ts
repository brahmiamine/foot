import { Entity, PrimaryColumn, CreateDateColumn } from "typeorm";

/**
 * Club(s) suivi(s) par un compte MEMBER — distinct du `User.teamId` qui
 * reste réservé aux comptes staff (ADMIN/OBSERVATEUR/SUPERADMIN, rattachés
 * à exactement un club). Un supporter peut suivre 0, 1 ou plusieurs clubs ;
 * cela n'a aucune incidence sur les autorisations (ce n'est pas ce champ qui
 * détermine les billets qu'il peut acheter — voir README racine, section
 * « Billetterie : séparer l'identité du supporter de l'organisateur de
 * l'événement »).
 */
@Entity("member_team_affiliations")
export class MemberTeamAffiliation {
  @PrimaryColumn({ type: "varchar", length: 191, name: "user_id" })
  userId!: string;

  @PrimaryColumn({ type: "char", length: 36, name: "team_id" })
  teamId!: string;

  @CreateDateColumn({ type: "datetime", name: "created_at" })
  createdAt!: Date;
}

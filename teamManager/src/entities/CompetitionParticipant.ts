import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from "typeorm";
import { Competition } from "./Competition";
import { InternalTeam } from "./InternalTeam";
import { Team } from "./Team";

/**
 * CompetitionParticipant Entity — participant à une compétition club
 * (`cms_competitions`) : une de nos propres équipes internes
 * (`internalTeamId`, ex: participer avec U17 A ET U17 B au même tournoi),
 * un club du référentiel partagé (`externalTeamId`), ou un adversaire non
 * référencé (`externalName`, texte libre). Sert d'identité stable pour le
 * calcul du classement, indépendante de is_home/opponent_* sur
 * `cms_friendly_matches` (utilisés pour un match amical isolé hors
 * compétition).
 */
@Entity("cms_competition_participants")
export class CompetitionParticipant {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id!: number;

  @Column({ type: "bigint", name: "competition_id" })
  competitionId!: number;

  @ManyToOne(() => Competition, { onDelete: "CASCADE" })
  @JoinColumn({ name: "competition_id" })
  competition!: Competition;

  @Column({ type: "bigint", nullable: true, name: "internal_team_id" })
  internalTeamId?: number | null;

  @ManyToOne(() => InternalTeam, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "internal_team_id" })
  internalTeam?: InternalTeam | null;

  @Column({ type: "char", length: 36, nullable: true, name: "external_team_id" })
  externalTeamId?: string | null;

  @ManyToOne(() => Team, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "external_team_id" })
  externalTeam?: Team | null;

  @Column({ type: "varchar", length: 200, nullable: true, name: "external_name" })
  externalName?: string | null;

  @Column({ type: "varchar", length: 255, nullable: true, name: "logo_url" })
  logoUrl?: string | null;

  @CreateDateColumn({ type: "datetime", name: "created_at" })
  createdAt!: Date;
}

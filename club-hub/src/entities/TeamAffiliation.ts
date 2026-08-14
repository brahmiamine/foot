import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

/** Lecture du scope réglementaire courant. L'écriture reste la propriété de federation-hub. */
@Entity("team_affiliations")
export class TeamAffiliation {
  @PrimaryGeneratedColumn("uuid") id!: string;
  @Column({ type: "char", length: 36, name: "team_id" }) teamId!: string;
  @Column({ type: "char", length: 36, name: "federation_id" }) federationId!: string;
  @Column({ type: "char", length: 36, name: "league_id", nullable: true }) leagueId!: string | null;
  @Column({ type: "char", length: 36, name: "saison_id", nullable: true }) saisonId!: string | null;
  @Column({ type: "enum", enum: ["ACTIVE", "ENDED", "SUSPENDED"] }) status!: "ACTIVE" | "ENDED" | "SUSPENDED";
}

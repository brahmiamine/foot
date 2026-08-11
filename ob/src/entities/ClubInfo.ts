import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";

/** Mappée sur `cms_club_info` (table teamManager), scopée par team_id. Lecture seule. */
@Entity("cms_club_info")
export class ClubInfo {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id!: number;

  @Column({ type: "char", length: 36, name: "team_id" })
  teamId!: string;

  @Column({ type: "longtext", nullable: true, name: "presentation_fr" })
  presentationFr?: string | null;

  @Column({ type: "longtext", nullable: true, name: "values_fr" })
  valuesFr?: string | null;

  @Column({ type: "longtext", nullable: true, name: "sport_project_fr" })
  sportProjectFr?: string | null;

  @Column({ type: "longtext", nullable: true, name: "organization_fr" })
  organizationFr?: string | null;
}

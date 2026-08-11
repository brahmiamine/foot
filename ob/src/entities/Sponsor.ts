import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";

export type SponsorLevel = "OR" | "ARGENT" | "BRONZE" | "LOCAL";

/** Mappée sur `cms_sponsors` (table teamManager), scopée par team_id. Lecture seule. */
@Entity("cms_sponsors")
export class Sponsor {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id!: number;

  @Column({ type: "char", length: 36, name: "team_id" })
  teamId!: string;

  @Column({ type: "varchar", length: 200, name: "company_name" })
  companyName!: string;

  @Column({ type: "varchar", length: 255, nullable: true, name: "logo_url" })
  logoUrl?: string | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  website?: string | null;

  @Column({ type: "enum", enum: ["OR", "ARGENT", "BRONZE", "LOCAL"], default: "LOCAL" })
  level!: SponsorLevel;

  @Column({ type: "tinyint", default: 1, name: "is_active" })
  isActive!: boolean;
}

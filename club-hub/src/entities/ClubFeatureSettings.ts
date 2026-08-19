import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from "typeorm";
import { Team } from "./Team";

export type ClubFeature =
  | "ACADEMY"
  | "RECRUITMENT"
  | "SPONSORING"
  | "TICKETING"
  | "MARKETPLACE";

export const CLUB_FEATURES: ClubFeature[] = [
  "ACADEMY",
  "RECRUITMENT",
  "SPONSORING",
  "TICKETING",
  "MARKETPLACE",
];

/**
 * GOV-010 — historique append-only d'activation des modules Club Hub.
 * L'absence de ligne signifie "activé" afin de préserver le comportement
 * historique des clubs existants.
 */
@Entity("cms_feature_settings")
@Unique("uq_cms_feature_settings_version", ["teamId", "feature", "version"])
@Index("idx_cms_feature_settings_resolution", [
  "teamId",
  "feature",
  "effectiveFrom",
  "effectiveUntil",
  "version",
])
export class ClubFeatureSettings {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "char", length: 36, name: "team_id" })
  teamId!: string;

  @ManyToOne(() => Team, { onDelete: "CASCADE" })
  @JoinColumn({ name: "team_id" })
  team!: Team;

  @Column({ type: "enum", enum: CLUB_FEATURES })
  feature!: ClubFeature;

  @Column({ type: "tinyint", default: 1 })
  enabled!: boolean;

  @Column({ type: "int", default: 1 })
  version!: number;

  @Column({ type: "datetime", nullable: true, name: "effective_from" })
  effectiveFrom!: Date | null;

  @Column({ type: "datetime", nullable: true, name: "effective_until" })
  effectiveUntil!: Date | null;

  @Column({ type: "varchar", length: 191, nullable: true, name: "updated_by" })
  updatedBy!: string | null;

  @CreateDateColumn({ type: "datetime", name: "created_at" })
  createdAt!: Date;
}

import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from "typeorm";
import { Team } from "./Team";

/** OB-001 : domaines de formulaires publics centralisés (CLUB-005). */
export type PublicFormDomain = "ACADEMY" | "RECRUITMENT" | "SPONSOR" | "SELLER" | "CONTACT";
export const PUBLIC_FORM_DOMAINS: PublicFormDomain[] = [
  "ACADEMY",
  "RECRUITMENT",
  "SPONSOR",
  "SELLER",
  "CONTACT",
];

/**
 * Ouverture/fermeture et rate limit par club/domaine. Chaque modification
 * crée une version immuable ; `effectiveFrom`/`effectiveUntil` déterminent
 * la version applicable à une date donnée (GOV-004).
 */
@Entity("cms_public_form_settings")
@Unique("uq_public_form_settings_version", ["teamId", "domain", "version"])
@Index("idx_public_form_settings_resolution", ["teamId", "domain", "effectiveFrom", "effectiveUntil", "version"])
export class PublicFormSettings {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "char", length: 36, name: "team_id" })
  teamId!: string;

  @ManyToOne(() => Team, { onDelete: "CASCADE" })
  @JoinColumn({ name: "team_id" })
  team!: Team;

  @Column({ type: "enum", enum: PUBLIC_FORM_DOMAINS })
  domain!: PublicFormDomain;

  @Column({ type: "tinyint", default: 1, name: "is_open" })
  isOpen!: boolean;

  @Column({ type: "datetime", nullable: true, name: "opens_at" })
  opensAt!: Date | null;

  @Column({ type: "datetime", nullable: true, name: "closes_at" })
  closesAt!: Date | null;

  /** NULL = pas de limite de volume (au-delà de l'ouverture/fermeture). */
  @Column({ type: "int", nullable: true, name: "rate_limit_max" })
  rateLimitMax!: number | null;

  @Column({ type: "int", nullable: true, name: "rate_limit_window_minutes" })
  rateLimitWindowMinutes!: number | null;

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

  @UpdateDateColumn({ type: "datetime", name: "updated_at" })
  updatedAt!: Date;
}
import { Column, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import type { DesignationMode } from "@/lib/designationPolicy";

/**
 * REF-006 — policy PLATFORM unique (pas encore de scope par saison/fédération),
 * même style que `CompetitionMatchProtocol` : ligne unique versionnée par
 * incrément, sans mécanisme `resolvePolicy` (un seul scope actif).
 */
@Entity("ms_official_designation_policies")
export class MatchOfficialDesignationPolicy {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id!: number;

  @Column({ type: "enum", enum: ["MANUAL", "SUGGESTED", "AUTO"], default: "MANUAL" })
  mode!: DesignationMode;

  @Column({ type: "int", default: 48, name: "min_rest_hours" })
  minRestHours!: number;

  @Column({ type: "json", nullable: true, name: "required_grades" })
  requiredGrades!: string[] | null;

  @Column({ type: "int", default: 0, name: "min_history_matches" })
  minHistoryMatches!: number;

  @Column({ type: "int", nullable: true, name: "max_distance_km" })
  maxDistanceKm!: number | null;

  @Column({ type: "int", default: 1 })
  version!: number;

  @Column({ type: "varchar", length: 191, nullable: true, name: "updated_by" })
  updatedBy?: string | null;

  @UpdateDateColumn({ type: "datetime", name: "updated_at" })
  updatedAt!: Date;
}

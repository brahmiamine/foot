import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from "typeorm";
import type { UnavailabilityReasonCategory } from "./RefereeUnavailability";

export type RefereeUnavailabilityPolicyScopeType = "PLATFORM";

export interface RefereeUnavailabilityPolicyValues {
  noticeMinHours: number;
  maxDurationDays: number;
  recurrenceAllowed: boolean;
  proofRequiredReasons: UnavailabilityReasonCategory[];
}

/**
 * REF-003 — policy versionnée (GOV-001 `resolvePolicy`, GOV-004) : préavis
 * minimal, durée maximale, autorisation de récurrence et raisons exigeant un
 * justificatif. PLATFORM uniquement pour l'instant (pas de scope
 * fédération/club sur un arbitre dans referee-hub).
 */
@Entity("referee_unavailability_policies")
@Index(["scopeType", "scopeId"])
export class RefereeUnavailabilityPolicy {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "enum", enum: ["PLATFORM"], name: "scope_type" })
  scopeType!: RefereeUnavailabilityPolicyScopeType;

  @Column({ type: "char", length: 36, nullable: true, name: "scope_id" })
  scopeId!: string | null;

  @Column({ type: "int" })
  version!: number;

  @Column({ type: "datetime", nullable: true, name: "effective_from" })
  effectiveFrom!: Date | null;

  @Column({ type: "datetime", nullable: true, name: "effective_until" })
  effectiveUntil!: Date | null;

  @Column({ type: "json", name: "values_json" })
  values!: Partial<RefereeUnavailabilityPolicyValues>;

  @Column({ type: "varchar", length: 191, name: "updated_by" })
  updatedBy!: string;

  @CreateDateColumn({ type: "datetime", name: "created_at" })
  createdAt!: Date;
}

import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from "typeorm";
import type {
  DisciplineCompetitionType,
  DisciplineRuleValues,
} from "@/lib/disciplineRules";

const COMPETITION_TYPES = ["championnat", "coupe", "tournois"] as const;

@Entity("cms_discipline_rule_sets")
@Index("idx_discipline_rule_scope", ["teamId", "seasonId", "competitionType", "category", "validFrom"])
@Index("uq_discipline_rule_scope_version", ["teamId", "seasonId", "competitionType", "category", "version"], { unique: true })
export class DisciplineRuleSet {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "char", length: 36, name: "team_id" })
  teamId!: string;

  @Column({ type: "char", length: 36, nullable: true, name: "season_id" })
  seasonId!: string | null;

  @Column({ type: "enum", enum: COMPETITION_TYPES, nullable: true, name: "competition_type" })
  competitionType!: DisciplineCompetitionType | null;

  @Column({ type: "varchar", length: 50, nullable: true })
  category!: string | null;

  @Column({ type: "int" })
  version!: number;

  @Column({ type: "datetime", name: "valid_from" })
  validFrom!: Date;

  @Column({ type: "datetime", nullable: true, name: "valid_until" })
  validUntil!: Date | null;

  @Column({ type: "int", name: "yellow_warning_threshold" })
  yellowWarningThreshold!: number;

  @Column({ type: "int", name: "yellow_suspension_threshold" })
  yellowSuspensionThreshold!: number;

  @Column({ type: "int", name: "yellow_suspension_matches" })
  yellowSuspensionMatches!: number;

  @Column({ type: "decimal", precision: 10, scale: 3, name: "yellow_fine_amount" })
  yellowFineAmount!: string;

  @Column({ type: "decimal", precision: 10, scale: 3, name: "red_fine_amount" })
  redFineAmount!: string;

  @Column({ type: "int", name: "fine_due_days" })
  fineDueDays!: number;

  @Column({ type: "int", name: "default_red_suspension_matches" })
  defaultRedSuspensionMatches!: number;

  @Column({ type: "int", name: "default_double_yellow_suspension_matches" })
  defaultDoubleYellowSuspensionMatches!: number;

  @Column({ type: "text" })
  reason!: string;

  @Column({ type: "varchar", length: 191, name: "created_by" })
  createdBy!: string;

  @CreateDateColumn({ type: "datetime", name: "created_at" })
  createdAt!: Date;
}

export type DisciplineOverrideTargetType = "MATCH" | "PLAYER";

@Entity("cms_discipline_rule_overrides")
@Index("idx_discipline_override_target", ["teamId", "targetType", "targetId", "validFrom"])
export class DisciplineRuleOverride {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "char", length: 36, name: "team_id" })
  teamId!: string;

  @Column({ type: "enum", enum: ["MATCH", "PLAYER"] })
  targetType!: DisciplineOverrideTargetType;

  @Column({ type: "varchar", length: 191, name: "target_id" })
  targetId!: string;

  @Column({ type: "json" })
  values!: Partial<DisciplineRuleValues>;

  @Column({ type: "datetime", name: "valid_from" })
  validFrom!: Date;

  @Column({ type: "datetime", nullable: true, name: "valid_until" })
  validUntil!: Date | null;

  @Column({ type: "text" })
  reason!: string;

  @Column({ type: "varchar", length: 191, name: "created_by" })
  createdBy!: string;

  @CreateDateColumn({ type: "datetime", name: "created_at" })
  createdAt!: Date;

  @Column({ type: "datetime", nullable: true, name: "revoked_at" })
  revokedAt!: Date | null;

  @Column({ type: "varchar", length: 191, nullable: true, name: "revoked_by" })
  revokedBy!: string | null;

  @Column({ type: "text", nullable: true, name: "revocation_reason" })
  revocationReason!: string | null;
}

@Entity("cms_discipline_rule_applications")
@Index("uq_discipline_rule_application_card", ["cardId"], { unique: true })
@Index("idx_discipline_rule_application_team", ["teamId", "createdAt"])
export class DisciplineRuleApplication {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "char", length: 36, name: "team_id" })
  teamId!: string;

  @Column({ type: "varchar", length: 191, name: "card_id" })
  cardId!: string;

  @Column({ type: "char", length: 36, name: "match_id" })
  matchId!: string;

  @Column({ type: "varchar", length: 191, name: "player_id" })
  playerId!: string;

  @Column({ type: "char", length: 36, nullable: true, name: "rule_set_id" })
  ruleSetId!: string | null;

  @Column({ type: "int", name: "rule_version" })
  ruleVersion!: number;

  @Column({ type: "char", length: 36, nullable: true, name: "override_id" })
  overrideId!: string | null;

  @Column({ type: "json" })
  context!: {
    seasonId: string | null;
    competitionType: DisciplineCompetitionType | null;
    category: string | null;
    effectiveAt: string;
    source: "LEGACY" | "RULE_SET";
  };

  @Column({ type: "json", name: "rule_snapshot" })
  ruleSnapshot!: DisciplineRuleValues;

  @Column({ type: "varchar", length: 191, name: "applied_by" })
  appliedBy!: string;

  @CreateDateColumn({ type: "datetime", name: "created_at" })
  createdAt!: Date;
}

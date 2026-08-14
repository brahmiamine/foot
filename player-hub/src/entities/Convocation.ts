import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from "typeorm";

export type ConvocationResponse = "PENDING" | "PRESENT" | "ABSENT";
export type MatchKind = "OFFICIAL" | "FRIENDLY";

/**
 * `cms_convocations` (possédée par club-hub) — voir
 * club-hub/src/entities/Convocation.ts. Seule table où player-hub écrit
 * pour un joueur : sa propre réponse (response/respondedAt), jamais rien
 * d'autre (voir services/PlayerPortalService.respondToConvocation).
 */
@Entity("cms_convocations")
export class Convocation {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id!: number;

  @Column({ type: "char", length: 36, name: "team_id" })
  teamId!: string;

  @Column({ type: "char", length: 36, nullable: true, name: "match_id" })
  matchId?: string | null;

  @Column({ type: "enum", enum: ["OFFICIAL", "FRIENDLY"], default: "OFFICIAL", name: "match_type" })
  matchType!: MatchKind;

  @Column({ type: "bigint", nullable: true, name: "friendly_match_id" })
  friendlyMatchId?: number | null;

  @Column({ type: "varchar", length: 191, name: "player_id" })
  playerId!: string;

  @Column({ type: "enum", enum: ["PENDING", "PRESENT", "ABSENT"], default: "PENDING" })
  response!: ConvocationResponse;

  @Column({ type: "enum", enum: ["STARTER", "SUBSTITUTE"], nullable: true, name: "lineup_role" })
  lineupRole?: "STARTER" | "SUBSTITUTE" | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  notes?: string | null;

  @Column({ type: "datetime", nullable: true, name: "notified_at" })
  notifiedAt?: Date | null;

  @Column({ type: "datetime", nullable: true, name: "responded_at" })
  respondedAt?: Date | null;

  @Column({ type: "datetime", nullable: true, name: "cancelled_at" })
  cancelledAt?: Date | null;

  @Column({ type: "varchar", length: 255, nullable: true, name: "cancelled_reason" })
  cancelledReason?: string | null;

  @CreateDateColumn({ type: "datetime", name: "created_at" })
  createdAt!: Date;
}

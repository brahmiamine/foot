import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from "typeorm";

/**
 * STAFF-005 — `cms_head_coach_delegations` (possédée par club-hub) :
 * délégation temporaire des fonctions d'entraîneur principal, bornée à un
 * seul match (`matchId`/`friendlyMatchId`) OU à une période
 * (`validFrom`/`validUntil`), jamais les deux ni aucun des deux — voir
 * `StaffDelegationService.validateScope`. Distincte de `cms_role_delegations`
 * (CLUB-012, générique) car elle porte une contrainte métier propre : le
 * délégataire doit être un membre du staff qualifié du club
 * (`delegateeStaffId` référence `cms_staff`), pas n'importe quel compte.
 */
@Entity("cms_head_coach_delegations")
@Index("idx_cms_head_coach_delegations_team_delegatee", ["teamId", "delegateeUserId"])
@Index("idx_cms_head_coach_delegations_match", ["teamId", "matchId"])
@Index("idx_cms_head_coach_delegations_friendly", ["teamId", "friendlyMatchId"])
export class HeadCoachDelegation {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "char", length: 36, name: "team_id" })
  teamId!: string;

  @Column({ type: "varchar", length: 191, name: "delegator_user_id" })
  delegatorUserId!: string;

  @Column({ type: "varchar", length: 191, name: "delegatee_user_id" })
  delegateeUserId!: string;

  @Column({ type: "bigint", name: "delegatee_staff_id" })
  delegateeStaffId!: number;

  @Column({ type: "char", length: 36, nullable: true, name: "match_id" })
  matchId!: string | null;

  @Column({ type: "bigint", nullable: true, name: "friendly_match_id" })
  friendlyMatchId!: number | null;

  @Column({ type: "datetime", nullable: true, name: "valid_from" })
  validFrom!: Date | null;

  @Column({ type: "datetime", nullable: true, name: "valid_until" })
  validUntil!: Date | null;

  @Column({ type: "text" })
  reason!: string;

  @Column({ type: "datetime", nullable: true, name: "revoked_at" })
  revokedAt!: Date | null;

  @Column({ type: "varchar", length: 191, nullable: true, name: "revoked_by" })
  revokedBy!: string | null;

  @Column({ type: "text", nullable: true, name: "revocation_reason" })
  revocationReason!: string | null;

  @CreateDateColumn({ type: "datetime", name: "created_at" })
  createdAt!: Date;
}

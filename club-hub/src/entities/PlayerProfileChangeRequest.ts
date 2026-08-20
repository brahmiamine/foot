import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
  UpdateDateColumn,
} from "typeorm";

export type PlayerProfileChangeRequestStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "STALE"
  | "AUTO_APPLIED";

export type PlayerProfileChangeSet = Partial<{
  imageUrl: string | null;
  firstNameFr: string;
  lastNameFr: string;
  firstNameAr: string | null;
  lastNameAr: string | null;
  birthDate: string | null;
  position: "GOALKEEPER" | "DEFENDER" | "MIDFIELDER" | "FORWARD" | null;
  number: number;
  category: string;
}>;

@Entity("cms_player_profile_change_requests")
@Index("idx_player_profile_requests_team_status", ["teamId", "status", "createdAt"])
@Index("idx_player_profile_requests_player", ["teamId", "playerId", "createdAt"])
export class PlayerProfileChangeRequest {
  @PrimaryColumn({ type: "char", length: 36 })
  id!: string;

  @Column({ type: "char", length: 36, name: "team_id" })
  teamId!: string;

  @Column({ type: "varchar", length: 191, name: "player_id" })
  playerId!: string;

  @Column({ type: "varchar", length: 191, name: "requester_user_id" })
  requesterUserId!: string;

  @Column({
    type: "enum",
    enum: ["PENDING", "APPROVED", "REJECTED", "STALE", "AUTO_APPLIED"],
    default: "PENDING",
  })
  status!: PlayerProfileChangeRequestStatus;

  @Column({ type: "json", name: "requested_changes" })
  requestedChanges!: PlayerProfileChangeSet;

  @Column({ type: "json", name: "before_snapshot" })
  beforeSnapshot!: PlayerProfileChangeSet;

  @Column({ type: "varchar", length: 191, nullable: true, name: "reviewer_user_id" })
  reviewerUserId!: string | null;

  @Column({ type: "text", nullable: true, name: "review_reason" })
  reviewReason!: string | null;

  @Column({ type: "datetime", nullable: true, name: "resolved_at" })
  resolvedAt!: Date | null;

  @CreateDateColumn({ type: "datetime", name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "datetime", name: "updated_at" })
  updatedAt!: Date;
}

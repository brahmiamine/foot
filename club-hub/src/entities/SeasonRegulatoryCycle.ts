import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import type { SeasonRegulatoryCycleStatus } from "../../../packages/regulatory-shared/src/seasonRegulatoryCycle";

const STATUSES = ["DRAFT", "ACTIVE", "CLOSED"] as const;

/** Lecture seule côté club-hub : la fédération est seule source de vérité (voir federation-hub/src/lib/seasonRegulatoryCycles.ts). Utilisée comme garde serveur pour la soumission des licences club et des inscriptions joueurs. */
@Entity("season_regulatory_cycles")
export class SeasonRegulatoryCycle {
  @PrimaryGeneratedColumn("uuid") id!: string;
  @Column({ type: "char", length: 36, name: "season_id" }) seasonId!: string;
  @Column({ type: "char", length: 36, name: "federation_id" }) federationId!: string;
  @Column({ type: "char", length: 36, nullable: true, name: "league_id" }) leagueId?: string | null;
  @Column({ type: "enum", enum: STATUSES, default: "DRAFT" }) status!: SeasonRegulatoryCycleStatus;
  @Column({ type: "datetime", nullable: true, name: "club_licensing_open_at" }) clubLicensingOpenAt?: Date | null;
  @Column({ type: "datetime", nullable: true, name: "club_licensing_close_at" }) clubLicensingCloseAt?: Date | null;
  @Column({ type: "datetime", nullable: true, name: "registration_open_at" }) registrationOpenAt?: Date | null;
  @Column({ type: "datetime", nullable: true, name: "registration_close_at" }) registrationCloseAt?: Date | null;
  @Column({ type: "char", length: 36, nullable: true, name: "previous_season_id" }) previousSeasonId?: string | null;
  @Column({ type: "datetime", nullable: true, name: "previous_season_expired_at" }) previousSeasonExpiredAt?: Date | null;
  @Column({ type: "varchar", length: 191, name: "created_by" }) createdBy!: string;
  @CreateDateColumn({ type: "datetime", name: "created_at" }) createdAt!: Date;
  @UpdateDateColumn({ type: "datetime", name: "updated_at" }) updatedAt!: Date;
}

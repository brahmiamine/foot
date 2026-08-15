import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import type { SeasonRegulatoryCycleStatus } from "../../../packages/regulatory-shared/src/seasonRegulatoryCycle";

const STATUSES = ["DRAFT", "ACTIVE", "CLOSED"] as const;

/** Lecture seule côté club-hub : la fédération est seule source de vérité du cycle réglementaire. */
@Entity("season_regulatory_cycles")
export class SeasonRegulatoryCycle {
  @PrimaryGeneratedColumn("uuid") id!: string;
  @Column({ type: "char", length: 36, name: "season_id" }) seasonId!: string;
  @Column({ type: "char", length: 36, name: "federation_id" }) federationId!: string;
  @Column({ type: "char", length: 36, nullable: true, name: "league_id" }) leagueId?: string | null;
  @Column({ type: "enum", enum: STATUSES, default: "DRAFT" }) status!: SeasonRegulatoryCycleStatus;
  @Column({ type: "datetime", nullable: true, name: "club_licensing_open_at" }) clubLicensingOpenAt?: Date | null;
  @Column({ type: "datetime", nullable: true, name: "club_licensing_close_at" }) clubLicensingCloseAt?: Date | null;
  @Column({ type: "datetime", nullable: true, name: "person_licensing_open_at" }) personLicensingOpenAt?: Date | null;
  @Column({ type: "datetime", nullable: true, name: "person_licensing_close_at" }) personLicensingCloseAt?: Date | null;
  @Column({ type: "datetime", nullable: true, name: "registration_open_at" }) registrationOpenAt?: Date | null;
  @Column({ type: "datetime", nullable: true, name: "registration_close_at" }) registrationCloseAt?: Date | null;
  @Column({ type: "datetime", nullable: true, name: "competition_entry_open_at" }) competitionEntryOpenAt?: Date | null;
  @Column({ type: "datetime", nullable: true, name: "competition_entry_close_at" }) competitionEntryCloseAt?: Date | null;
  @Column({ type: "datetime", nullable: true, name: "financial_compliance_open_at" }) financialComplianceOpenAt?: Date | null;
  @Column({ type: "datetime", nullable: true, name: "financial_compliance_close_at" }) financialComplianceCloseAt?: Date | null;
  @Column({ type: "datetime", nullable: true, name: "transfer_window_open_at" }) transferWindowOpenAt?: Date | null;
  @Column({ type: "datetime", nullable: true, name: "transfer_window_close_at" }) transferWindowCloseAt?: Date | null;
  @Column({ type: "datetime", nullable: true, name: "season_prepared_at" }) seasonPreparedAt?: Date | null;
  @Column({ type: "char", length: 36, nullable: true, name: "previous_season_id" }) previousSeasonId?: string | null;
  @Column({ type: "datetime", nullable: true, name: "previous_season_expired_at" }) previousSeasonExpiredAt?: Date | null;
  @Column({ type: "varchar", length: 191, name: "created_by" }) createdBy!: string;
  @CreateDateColumn({ type: "datetime", name: "created_at" }) createdAt!: Date;
  @UpdateDateColumn({ type: "datetime", name: "updated_at" }) updatedAt!: Date;
}

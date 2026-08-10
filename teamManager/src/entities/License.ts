import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from "typeorm";
import { Team } from "./Team";
import { Season } from "./Season";
import { Player } from "./Player";
import { Staff } from "./Staff";

export type LicenseHolderType = "PLAYER" | "STAFF";
export type LicenseType = "PLAYER" | "COACH" | "EXECUTIVE" | "OTHER";
export type LicenseStatus = "PENDING" | "ACTIVE" | "EXPIRED" | "SUSPENDED" | "REJECTED";

/**
 * License Entity — licence FTF d'un joueur ou d'un membre du staff,
 * valable une saison et à renouveler chaque année (règlements généraux
 * FTF, édition juillet 2025). teamManager n'est PAS la source officielle :
 * les colonnes `external*` préparent une future synchronisation avec le
 * système de gestion des licences de la FTF ; en attendant, la licence est
 * saisie/suivie manuellement ici. Table propre à cette app, scopée par
 * team_id.
 */
@Entity("cms_licenses")
export class License {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id!: number;

  @Column({ type: "char", length: 36, name: "team_id" })
  teamId!: string;

  @ManyToOne(() => Team, { onDelete: "CASCADE" })
  @JoinColumn({ name: "team_id" })
  team!: Team;

  @Column({ type: "bigint", nullable: true, name: "season_id" })
  seasonId?: number | null;

  @ManyToOne(() => Season, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "season_id" })
  season?: Season | null;

  @Column({ type: "enum", enum: ["PLAYER", "STAFF"], name: "holder_type" })
  holderType!: LicenseHolderType;

  @Column({ type: "varchar", length: 191, nullable: true, name: "player_id" })
  playerId?: string | null;

  @ManyToOne(() => Player, { onDelete: "CASCADE", nullable: true })
  @JoinColumn({ name: "player_id" })
  player?: Player | null;

  @Column({ type: "bigint", nullable: true, name: "staff_id" })
  staffId?: number | null;

  @ManyToOne(() => Staff, { onDelete: "CASCADE", nullable: true })
  @JoinColumn({ name: "staff_id" })
  staff?: Staff | null;

  @Column({ type: "varchar", length: 50, nullable: true, name: "license_number" })
  licenseNumber?: string | null;

  @Column({ type: "enum", enum: ["PLAYER", "COACH", "EXECUTIVE", "OTHER"], default: "PLAYER", name: "license_type" })
  licenseType!: LicenseType;

  @Column({ type: "enum", enum: ["PENDING", "ACTIVE", "EXPIRED", "SUSPENDED", "REJECTED"], default: "PENDING" })
  status!: LicenseStatus;

  @Column({ type: "date", nullable: true, name: "issued_at" })
  issuedAt?: string | null;

  @Column({ type: "date", nullable: true, name: "expires_at" })
  expiresAt?: string | null;

  @Column({ type: "varchar", length: 500, nullable: true, name: "document_url" })
  documentUrl?: string | null;

  @Column({ type: "varchar", length: 500, nullable: true })
  notes?: string | null;

  @Column({ type: "varchar", length: 100, nullable: true, name: "external_id" })
  externalId?: string | null;

  @Column({ type: "varchar", length: 50, nullable: true, name: "external_source" })
  externalSource?: string | null;

  @Column({ type: "varchar", length: 50, nullable: true, name: "external_status" })
  externalStatus?: string | null;

  @Column({ type: "datetime", nullable: true, name: "last_synced_at" })
  lastSyncedAt?: Date | null;

  @CreateDateColumn({ type: "datetime", name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "datetime", nullable: true, name: "updated_at" })
  updatedAt?: Date | null;
}

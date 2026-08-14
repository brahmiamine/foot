import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from "typeorm";
import { Sheet } from "./Sheet";

export type OfficialRole = "REFEREE_CENTRAL" | "ASSISTANT_1" | "ASSISTANT_2" | "FOURTH_OFFICIAL" | "DELEGATE";

/**
 * MatchOfficial Entity — les officiels de la rencontre (arbitre central,
 * assistants, 4e arbitre, délégué principal), saisis/vérifiés le jour du
 * match avant les signatures avant-match (écran "Infos arbitre" de la FMI).
 */
@Entity("ms_match_officials")
export class MatchOfficial {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id!: number;

  @Column({ type: "bigint", name: "sheet_id" })
  sheetId!: number;

  @ManyToOne(() => Sheet, { onDelete: "CASCADE" })
  @JoinColumn({ name: "sheet_id" })
  sheet!: Sheet;

  @Column({ type: "enum", enum: ["REFEREE_CENTRAL", "ASSISTANT_1", "ASSISTANT_2", "FOURTH_OFFICIAL", "DELEGATE"] })
  role!: OfficialRole;

  @Column({ type: "varchar", length: 191, nullable: true, name: "full_name" })
  fullName?: string | null;

  @Column({ type: "varchar", length: 50, nullable: true, name: "license_number" })
  licenseNumber?: string | null;

  @Column({ type: "tinyint", default: 0 })
  confirmed!: boolean;

  @Column({ type: "datetime", nullable: true, name: "confirmed_at" })
  confirmedAt?: Date | null;

  @CreateDateColumn({ type: "datetime", name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "datetime", name: "updated_at", nullable: true })
  updatedAt?: Date | null;
}

export const MANDATORY_OFFICIAL_ROLES: OfficialRole[] = ["REFEREE_CENTRAL", "ASSISTANT_1", "ASSISTANT_2", "DELEGATE"];

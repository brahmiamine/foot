import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from "typeorm";
import type { SheetStatus } from "./Sheet";

export type SheetAmendmentStatus = "AMENDMENT_REQUESTED" | "AMENDED" | "RE_SIGNED";

@Entity("ms_sheet_amendments")
@Index(["sheetId", "status"])
export class SheetAmendment {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id!: number;

  @Column({ type: "bigint", name: "sheet_id" })
  sheetId!: number;

  @Column({ type: "char", length: 36, name: "match_id" })
  matchId!: string;

  @Column({ type: "enum", enum: ["AMENDMENT_REQUESTED", "AMENDED", "RE_SIGNED"] })
  status!: SheetAmendmentStatus;

  @Column({ type: "varchar", length: 32, name: "original_sheet_status" })
  originalSheetStatus!: SheetStatus;

  @Column({ type: "text" })
  reason!: string;

  @Column({ type: "varchar", length: 36, nullable: true, name: "requested_by_user_id" })
  requestedByUserId?: string | null;

  @Column({ type: "varchar", length: 191, nullable: true, name: "requested_by_name" })
  requestedByName?: string | null;

  @CreateDateColumn({ type: "datetime", name: "requested_at" })
  requestedAt!: Date;

  @Column({ type: "datetime", nullable: true, name: "amended_at" })
  amendedAt?: Date | null;

  @Column({ type: "datetime", nullable: true, name: "re_signed_at" })
  reSignedAt?: Date | null;
}

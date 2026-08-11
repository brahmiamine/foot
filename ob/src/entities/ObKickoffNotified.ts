import { Entity, PrimaryColumn, CreateDateColumn } from "typeorm";

@Entity("ob_kickoff_notified")
export class ObKickoffNotified {
  @PrimaryColumn({ type: "char", length: 36, name: "match_id", collation: "utf8mb4_uca1400_ai_ci" })
  matchId!: string;

  @CreateDateColumn({ type: "datetime", name: "notified_at" })
  notifiedAt!: Date;
}

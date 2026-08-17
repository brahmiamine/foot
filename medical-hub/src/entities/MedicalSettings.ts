import { Column, Entity, PrimaryColumn, UpdateDateColumn } from "typeorm";

@Entity("cms_medical_settings")
export class MedicalSettings {
  @PrimaryColumn({ type: "char", length: 36, name: "team_id" })
  teamId!: string;

  @Column({ type: "tinyint", default: 1, name: "clearance_required" })
  clearanceRequired!: boolean;

  @Column({ type: "tinyint", default: 1, name: "severe_second_opinion_required" })
  severeSecondOpinionRequired!: boolean;

  @Column({ type: "varchar", length: 191, nullable: true, name: "updated_by" })
  updatedBy?: string | null;

  @UpdateDateColumn({ type: "datetime", name: "updated_at" })
  updatedAt!: Date;
}

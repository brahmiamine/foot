import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

export type UnavailabilityReasonCategory = "MEDICAL" | "PROFESSIONAL" | "PERSONAL" | "OTHER";

@Entity("referee_unavailabilities")
export class RefereeUnavailability {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id!: number;

  @Column({ type: "varchar", length: 191, name: "user_id" })
  userId!: string;

  @Column({ type: "date", name: "start_date" })
  startDate!: string;

  @Column({ type: "date", name: "end_date" })
  endDate!: string;

  @Column({ type: "varchar", length: 500, nullable: true })
  reason?: string | null;

  /** REF-003 : catégorie de motif, détermine si un justificatif est exigé par la policy. */
  @Column({
    type: "enum",
    enum: ["MEDICAL", "PROFESSIONAL", "PERSONAL", "OTHER"],
    name: "reason_category",
    default: "OTHER",
  })
  reasonCategory!: UnavailabilityReasonCategory;

  /** REF-003 : justificatif requis pour certaines catégories de motif (policy). */
  @Column({ type: "varchar", length: 500, nullable: true, name: "proof_document_url" })
  proofDocumentUrl?: string | null;

  /** REF-003 : identifiant commun à toutes les occurrences générées par une même récurrence. */
  @Column({ type: "char", length: 36, nullable: true, name: "recurrence_group_id" })
  recurrenceGroupId?: string | null;

  @Column({ type: "datetime", nullable: true, name: "cancelled_at" })
  cancelledAt?: Date | null;

  @CreateDateColumn({ type: "datetime", name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "datetime", name: "updated_at" })
  updatedAt!: Date;
}

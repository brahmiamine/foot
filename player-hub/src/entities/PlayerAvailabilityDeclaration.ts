import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

export type PlayerAvailabilityStatus = "AVAILABLE" | "UNAVAILABLE" | "LIMITED";

/**
 * PLAYER-002 — `cms_player_availability_declarations` (possédée par
 * club-hub). player-hub y écrit directement ses propres lignes (même
 * principe que Convocation.response) : c'est une déclaration personnelle du
 * joueur, sans workflow d'approbation. staff-hub la lit en lecture seule
 * pour la composition (voir staff-hub/src/entities/PlayerAvailabilityDeclaration.ts).
 */
@Entity("cms_player_availability_declarations")
export class PlayerAvailabilityDeclaration {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id!: number;

  @Column({ type: "char", length: 36, name: "team_id" })
  teamId!: string;

  @Column({ type: "varchar", length: 191, name: "player_id" })
  playerId!: string;

  @Column({ type: "enum", enum: ["AVAILABLE", "UNAVAILABLE", "LIMITED"] })
  status!: PlayerAvailabilityStatus;

  @Column({ type: "date", name: "start_date" })
  startDate!: string;

  @Column({ type: "date", name: "end_date" })
  endDate!: string;

  @Column({ type: "varchar", length: 500, nullable: true })
  reason?: string | null;

  @Column({ type: "varchar", length: 191, name: "declared_by_user_id" })
  declaredByUserId!: string;

  @Column({ type: "datetime", nullable: true, name: "cancelled_at" })
  cancelledAt?: Date | null;

  @CreateDateColumn({ type: "datetime", name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "datetime", name: "updated_at" })
  updatedAt!: Date;
}

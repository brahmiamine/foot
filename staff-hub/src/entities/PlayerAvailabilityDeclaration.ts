import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

export type PlayerAvailabilityStatus = "AVAILABLE" | "UNAVAILABLE" | "LIMITED";

/**
 * PLAYER-002 — lecture seule sur `cms_player_availability_declarations` : la
 * source de vérité et les écritures appartiennent à player-hub (déclaration
 * personnelle du joueur, voir player-hub/src/entities/
 * PlayerAvailabilityDeclaration.ts). Consommée ici lors de la composition
 * (voir StaffLineupService.setLineupEntry).
 */
@Entity("cms_player_availability_declarations")
export class PlayerAvailabilityDeclaration {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id!: number;

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

  @Column({ type: "datetime", nullable: true, name: "cancelled_at" })
  cancelledAt?: Date | null;
}

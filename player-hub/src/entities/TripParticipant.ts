import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from "typeorm";

export type TripParticipantType = "PLAYER" | "PARENT" | "STAFF";
export type TripTransportOffer = "NONE" | "NEEDS_TRANSPORT" | "CAN_DRIVE";

/**
 * `cms_trip_participants` (possédée par club-hub) — voir
 * club-hub/src/entities/TripParticipant.ts. player-hub écrit uniquement
 * transportOffer/offeredSeats pour la ligne du joueur connecté.
 */
@Entity("cms_trip_participants")
export class TripParticipant {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id!: number;

  @Column({ type: "bigint", name: "trip_id" })
  tripId!: number;

  @Column({ type: "enum", enum: ["PLAYER", "PARENT", "STAFF"], default: "PLAYER", name: "participant_type" })
  participantType!: TripParticipantType;

  @Column({ type: "varchar", length: 191, nullable: true, name: "player_id" })
  playerId?: string | null;

  @Column({ type: "enum", enum: ["NONE", "NEEDS_TRANSPORT", "CAN_DRIVE"], default: "NONE", name: "transport_offer" })
  transportOffer!: TripTransportOffer;

  @Column({ type: "int", nullable: true, name: "offered_seats" })
  offeredSeats?: number | null;

  @Column({ type: "tinyint", default: 0 })
  confirmed!: boolean;

  @CreateDateColumn({ type: "datetime", name: "created_at" })
  createdAt!: Date;
}

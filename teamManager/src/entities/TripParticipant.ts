import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from "typeorm";
import { Trip } from "./Trip";
import { Player } from "./Player";
import { TripVehicle } from "./TripVehicle";

export type TripParticipantType = "PLAYER" | "PARENT" | "STAFF";
export type TripTransportOffer = "NONE" | "NEEDS_TRANSPORT" | "CAN_DRIVE";

/**
 * TripParticipant Entity — joueur présent, parent accompagnateur ou membre
 * du staff sur un déplacement, avec offre/besoin de transport ("j'ai
 * besoin d'un transport" / "je peux transporter 3 joueurs").
 */
@Entity("cms_trip_participants")
export class TripParticipant {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id!: number;

  @Column({ type: "bigint", name: "trip_id" })
  tripId!: number;

  @ManyToOne(() => Trip, { onDelete: "CASCADE" })
  @JoinColumn({ name: "trip_id" })
  trip!: Trip;

  @Column({ type: "enum", enum: ["PLAYER", "PARENT", "STAFF"], default: "PLAYER", name: "participant_type" })
  participantType!: TripParticipantType;

  @Column({ type: "varchar", length: 191, nullable: true, name: "player_id" })
  playerId?: string | null;

  @ManyToOne(() => Player, { onDelete: "CASCADE", nullable: true })
  @JoinColumn({ name: "player_id" })
  player?: Player | null;

  @Column({ type: "varchar", length: 150, nullable: true })
  name?: string | null;

  @Column({ type: "enum", enum: ["NONE", "NEEDS_TRANSPORT", "CAN_DRIVE"], default: "NONE", name: "transport_offer" })
  transportOffer!: TripTransportOffer;

  @Column({ type: "int", nullable: true, name: "offered_seats" })
  offeredSeats?: number | null;

  @Column({ type: "bigint", nullable: true, name: "vehicle_id" })
  vehicleId?: number | null;

  @ManyToOne(() => TripVehicle, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "vehicle_id" })
  vehicle?: TripVehicle | null;

  @Column({ type: "tinyint", default: 0 })
  confirmed!: boolean;

  @CreateDateColumn({ type: "datetime", name: "created_at" })
  createdAt!: Date;
}

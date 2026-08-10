import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from "typeorm";
import { Trip } from "./Trip";

export type TripVehicleType = "BUS" | "MINIBUS" | "CAR" | "OTHER";

/** TripVehicle Entity — véhicule (bus/minibus/voiture) affecté à un déplacement, avec chauffeur et places. */
@Entity("cms_trip_vehicles")
export class TripVehicle {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id!: number;

  @Column({ type: "bigint", name: "trip_id" })
  tripId!: number;

  @ManyToOne(() => Trip, { onDelete: "CASCADE" })
  @JoinColumn({ name: "trip_id" })
  trip!: Trip;

  @Column({ type: "enum", enum: ["BUS", "MINIBUS", "CAR", "OTHER"], default: "MINIBUS", name: "vehicle_type" })
  vehicleType!: TripVehicleType;

  @Column({ type: "varchar", length: 100, nullable: true })
  label?: string | null;

  @Column({ type: "varchar", length: 150, nullable: true, name: "driver_name" })
  driverName?: string | null;

  @Column({ type: "int", default: 0 })
  seats!: number;
}

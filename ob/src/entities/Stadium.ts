import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";

export type StadiumFacilityType = "STADIUM" | "TRAINING_GROUND" | "LOCKER_ROOM" | "GYM" | "SPORTS_CENTER" | "OTHER";

/** Mappée sur `cms_stadiums` (table teamManager), scopée par team_id. Lecture seule. */
@Entity("cms_stadiums")
export class Stadium {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id!: number;

  @Column({ type: "char", length: 36, name: "team_id" })
  teamId!: string;

  @Column({ type: "varchar", length: 200, name: "name_fr" })
  nameFr!: string;
  @Column({ type: "varchar", length: 200, nullable: true, name: "name_ar" })
  nameAr?: string | null;

  @Column({ type: "varchar", length: 255, nullable: true, name: "address_fr" })
  addressFr?: string | null;
  @Column({ type: "varchar", length: 255, nullable: true, name: "address_ar" })
  addressAr?: string | null;

  @Column({ type: "varchar", length: 100, nullable: true, name: "city_fr" })
  cityFr?: string | null;
  @Column({ type: "varchar", length: 100, nullable: true, name: "city_ar" })
  cityAr?: string | null;

  @Column({ type: "boolean", default: false, name: "is_home" })
  isHome!: boolean;

  @Column({ type: "enum", enum: ["STADIUM", "TRAINING_GROUND", "LOCKER_ROOM", "GYM", "SPORTS_CENTER", "OTHER"], default: "STADIUM", name: "facility_type" })
  facilityType!: StadiumFacilityType;

  @Column({ type: "int", nullable: true })
  capacity?: number | null;

  @Column({ type: "text", nullable: true, name: "description_fr" })
  descriptionFr?: string | null;

  @Column({ type: "varchar", length: 255, nullable: true, name: "image_url" })
  imageUrl?: string | null;
}

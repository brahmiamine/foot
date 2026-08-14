import { Column, Entity, PrimaryColumn } from "typeorm";

@Entity("User")
export class User {
  @PrimaryColumn({ type: "varchar", length: 191 })
  id!: string;

  @Column({ type: "varchar", length: 191 })
  name!: string;

  @Column({ type: "varchar", length: 100, nullable: true })
  firstName?: string | null;

  @Column({ type: "varchar", length: 100, nullable: true })
  lastName?: string | null;

  @Column({ type: "varchar", length: 30, nullable: true })
  phoneNumber?: string | null;

  @Column({ type: "varchar", length: 191 })
  email!: string;

  @Column({ type: "varchar", length: 191 })
  role!: string;
}

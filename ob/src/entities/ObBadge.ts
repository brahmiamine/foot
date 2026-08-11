import { Entity, PrimaryColumn, Column, CreateDateColumn } from "typeorm";

@Entity("ob_badges")
export class ObBadge {
  @PrimaryColumn({ type: "varchar", length: 64 })
  id!: string;

  @Column({ type: "varchar", length: 191 })
  name!: string;

  @Column({ type: "varchar", length: 255 })
  description!: string;

  @Column({ type: "varchar", length: 16 })
  icon!: string;

  @Column({ type: "int", default: 0, name: "sort_order" })
  sortOrder!: number;

  @CreateDateColumn({ type: "datetime", name: "created_at" })
  createdAt!: Date;
}

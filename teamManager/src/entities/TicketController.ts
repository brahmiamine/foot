import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from "typeorm";

/** Un contrôleur = un compte OBSERVATEUR existant avec la permission "ticketing.scan", + une porte par défaut. */
@Entity("cms_ticket_controllers")
export class TicketController {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "char", length: 36, name: "team_id" })
  teamId!: string;

  @Column({ type: "varchar", length: 191, name: "user_id" })
  userId!: string;

  @Column({ type: "varchar", length: 50, nullable: true })
  gate?: string | null;

  @CreateDateColumn({ type: "datetime", name: "created_at" })
  createdAt!: Date;
}

import { Entity, PrimaryGeneratedColumn, Column, Index, CreateDateColumn } from "typeorm";

export enum TicketStatus {
  PENDING = "PENDING",
  PAID = "PAID",
  CANCELLED = "CANCELLED",
  USED = "USED",
}

/**
 * Un billet acheté. `organizerTeamId` est une copie de `matches.equipe_home`
 * au moment de l'achat (le club organisateur), jamais le club favori de
 * l'acheteur — voir README racine, section « Billetterie : séparer
 * l'identité du supporter de l'organisateur de l'événement ». Pas
 * d'intégration paiement réelle dans cette itération (voir src/lib/tickets.ts) :
 * le statut PENDING/PAID sert de point d'extension pour brancher payment-api
 * plus tard sans changer le modèle.
 */
@Entity({ name: "tk_tickets" })
export class Ticket {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 36 })
  matchId!: string;

  @Column({ type: "varchar", length: 36 })
  matchTicketCategoryId!: string;

  @Column({ type: "varchar", length: 36 })
  organizerTeamId!: string;

  // FK logique vers User.id (sso, role MEMBER) — jamais un id envoyé par le
  // frontend, toujours celui de la session sso vérifiée côté serveur.
  @Index()
  @Column({ type: "varchar", length: 191 })
  purchaserId!: string;

  @Column({ type: "enum", enum: TicketStatus, default: TicketStatus.PENDING })
  status!: TicketStatus;

  @Index({ unique: true })
  @Column({ type: "varchar", length: 32 })
  reference!: string;

  @Column({ type: "decimal", precision: 10, scale: 3 })
  price!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @Column({ type: "datetime", nullable: true })
  paidAt!: Date | null;

  @Column({ type: "datetime", nullable: true })
  usedAt!: Date | null;
}

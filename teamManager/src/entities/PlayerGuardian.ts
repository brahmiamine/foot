import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from "typeorm";
import { Player } from "./Player";
import { Guardian } from "./Guardian";

/** PlayerGuardian Entity — lien joueur <-> parent/tuteur, avec préférences de contact. */
@Entity("cms_player_guardians")
export class PlayerGuardian {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id!: number;

  @Column({ type: "varchar", length: 191, name: "player_id" })
  playerId!: string;

  @ManyToOne(() => Player, { onDelete: "CASCADE" })
  @JoinColumn({ name: "player_id" })
  player!: Player;

  @Column({ type: "bigint", name: "guardian_id" })
  guardianId!: number;

  @ManyToOne(() => Guardian, { onDelete: "CASCADE" })
  @JoinColumn({ name: "guardian_id" })
  guardian!: Guardian;

  @Column({ type: "varchar", length: 50, nullable: true })
  relationship?: string | null;

  @Column({ type: "tinyint", default: 0, name: "is_primary" })
  isPrimary!: boolean;

  @Column({ type: "tinyint", default: 1, name: "has_custody" })
  hasCustody!: boolean;

  @Column({ type: "tinyint", default: 1, name: "receives_notifications" })
  receivesNotifications!: boolean;

  @Column({ type: "tinyint", default: 1, name: "receives_documents" })
  receivesDocuments!: boolean;
}

import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from "typeorm";

export type AccountInvitationPurpose = "PLAYER_ACCOUNT";

/**
 * Invitation d'activation d'un compte provisionné par un service métier.
 * Identity reste seul propriétaire du secret et du cycle de vie du compte :
 * le jeton brut n'est envoyé que par email, seule son empreinte SHA-256 est
 * persistée. Une invitation est bornée dans le temps et à usage unique.
 */
@Entity("account_invitations")
export class AccountInvitation {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index()
  @Column({ type: "varchar", length: 191, name: "user_id" })
  userId!: string;

  @Column({ type: "varchar", length: 40 })
  purpose!: AccountInvitationPurpose;

  @Index({ unique: true })
  @Column({ type: "varchar", length: 191, name: "token_hash" })
  tokenHash!: string;

  @Column({ type: "datetime", name: "expires_at" })
  expiresAt!: Date;

  @Column({ type: "datetime", nullable: true, name: "used_at" })
  usedAt?: Date | null;

  @Column({ type: "varchar", length: 191, nullable: true, name: "invited_by_user_id" })
  invitedByUserId?: string | null;

  @CreateDateColumn({ type: "datetime", name: "created_at" })
  createdAt!: Date;
}

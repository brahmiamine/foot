import { Column, Entity, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm'

/**
 * Invitation à usage unique pour créer un compte staff (ADMIN/OBSERVATEUR)
 * d'un club — voir src/lib/staffInvitations.ts. `tokenHash` est le SHA-256
 * du jeton brut envoyé par email (jamais stocké en clair), même pattern que
 * `sso/src/entities/PasswordResetToken.ts`.
 */
@Entity({ name: 'staff_invitations' })
export class StaffInvitation {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ type: 'char', length: 36, name: 'team_id' })
  teamId!: string

  @Column({ type: 'varchar', length: 191 })
  name!: string

  @Column({ type: 'varchar', length: 191 })
  email!: string

  @Column({ type: 'enum', enum: ['ADMIN', 'OBSERVATEUR'] })
  role!: 'ADMIN' | 'OBSERVATEUR'

  @Column({ type: 'varchar', length: 191, name: 'token_hash' })
  tokenHash!: string

  @Column({ type: 'datetime', name: 'expires_at' })
  expiresAt!: Date

  @Column({ type: 'datetime', nullable: true, name: 'accepted_at' })
  acceptedAt?: Date | null

  @CreateDateColumn({ type: 'datetime', name: 'created_at' })
  createdAt!: Date
}

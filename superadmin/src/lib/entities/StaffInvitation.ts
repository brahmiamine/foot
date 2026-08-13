import { Column, Entity, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm'

export type StaffInvitationRole =
  | 'ADMIN'
  | 'OBSERVATEUR'
  | 'FEDERATION_ADMIN'
  | 'LEAGUE_ADMIN'
  | 'REFEREE'
  | 'MATCH_OFFICIAL'
  | 'REFEREE_OBSERVER'

/**
 * Invitation à usage unique pour créer un compte staff — voir
 * src/lib/staffInvitations.ts. `tokenHash` est le SHA-256 du jeton brut
 * envoyé par email (jamais stocké en clair), même pattern que
 * `sso/src/entities/PasswordResetToken.ts`.
 *
 * migration.md §0 (provisioning) : élargi au-delà d'ADMIN/OBSERVATEUR d'un
 * club pour couvrir les rôles cibles Fédération/Ligue/Club. Exactement un
 * des trois scopes est renseigné selon le rôle (voir
 * staffInvitations.ts#createInvitation qui l'impose) : `teamId` pour
 * ADMIN/OBSERVATEUR, `federationId` pour FEDERATION_ADMIN, `leagueId` pour
 * LEAGUE_ADMIN ; aucun des trois pour REFEREE/MATCH_OFFICIAL/
 * REFEREE_OBSERVER (périmètre affecté match par match, pas à la création
 * du compte — voir Phase 4). PLATFORM_SUPERADMIN volontairement absent de
 * ce flux self-service.
 */
@Entity({ name: 'staff_invitations' })
export class StaffInvitation {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ type: 'char', length: 36, name: 'team_id', nullable: true })
  teamId?: string | null

  @Column({ type: 'char', length: 36, name: 'federation_id', nullable: true })
  federationId?: string | null

  @Column({ type: 'char', length: 36, name: 'league_id', nullable: true })
  leagueId?: string | null

  @Column({ type: 'varchar', length: 191 })
  name!: string

  @Column({ type: 'varchar', length: 191 })
  email!: string

  @Column({
    type: 'enum',
    enum: ['ADMIN', 'OBSERVATEUR', 'FEDERATION_ADMIN', 'LEAGUE_ADMIN', 'REFEREE', 'MATCH_OFFICIAL', 'REFEREE_OBSERVER'],
  })
  role!: StaffInvitationRole

  @Column({ type: 'varchar', length: 191, name: 'token_hash' })
  tokenHash!: string

  @Column({ type: 'datetime', name: 'expires_at' })
  expiresAt!: Date

  @Column({ type: 'datetime', nullable: true, name: 'accepted_at' })
  acceptedAt?: Date | null

  @CreateDateColumn({ type: 'datetime', name: 'created_at' })
  createdAt!: Date
}

import { Column, Entity, PrimaryColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm'

export type UserRole = 'ADMIN' | 'OBSERVATEUR' | 'SUPERADMIN'

/**
 * Comptes de connexion des clubs, table partagée avec cardManager/teamManager
 * (gérés historiquement par l'app "superadmin", désormais fusionnée ici sous
 * /admin/club). Un compte ADMIN/OBSERVATEUR appartient à un club (teamId) et
 * sert à se connecter à cardManager/teamManager — ArbiNote ne fait ici que
 * créer/éditer ces comptes, il ne s'en sert pas pour sa propre authentification
 * (qui reste le compte admin unique ADMIN_USER/ADMIN_PASS).
 */
@Entity({ name: 'User' })
export class User {
  @PrimaryColumn({ type: 'varchar', length: 191 })
  id!: string

  @Column({ type: 'varchar', length: 191 })
  name!: string

  @Column({ type: 'varchar', length: 191, unique: true })
  email!: string

  @Column({ type: 'varchar', length: 191 })
  password!: string

  @Column({
    type: 'enum',
    enum: ['ADMIN', 'OBSERVATEUR', 'SUPERADMIN'],
    default: 'OBSERVATEUR',
  })
  role!: UserRole

  @Column({ type: 'tinyint' })
  isActive!: boolean

  @Column({ type: 'varchar', length: 191, nullable: true })
  teamId?: string | null

  @CreateDateColumn({ type: 'datetime' })
  createdAt!: Date

  @UpdateDateColumn({ type: 'datetime' })
  updatedAt!: Date
}

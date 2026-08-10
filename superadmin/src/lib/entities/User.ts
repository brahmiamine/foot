import { Column, Entity, PrimaryColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm'

export type UserRole = 'ADMIN' | 'OBSERVATEUR' | 'SUPERADMIN'

/**
 * Comptes de connexion partagés par les 5 apps (matchsheet, arbinote,
 * superadmin, teamManager, sso), table gérée ici sous /admin/club. Un compte
 * ADMIN/OBSERVATEUR appartient à un club (teamId) et sert à se connecter à
 * teamManager/matchsheet ; SUPERADMIN (teamId null) sert à se connecter à
 * superadmin/arbinote. L'authentification elle-même (vérification du mot de
 * passe, émission du cookie de session) se fait uniquement dans l'app `sso`
 * — voir sso/src/lib/authenticate.ts.
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

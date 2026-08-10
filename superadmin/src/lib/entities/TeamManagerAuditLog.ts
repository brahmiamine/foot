import { Column, Entity, PrimaryColumn } from 'typeorm'

/**
 * Lecture seule de la table `AuditLog` (PascalCase), le journal d'audit de
 * teamManager — schéma différent de `audit_logs` (snake_case, utilisé par
 * arbinote/superadmin/matchsheet). Utilisée uniquement pour fusionner les
 * deux journaux dans la vue /admin/audit. Jamais écrite depuis superadmin.
 */
@Entity({ name: 'AuditLog' })
export class TeamManagerAuditLog {
  @PrimaryColumn({ type: 'varchar', length: 191 })
  id!: string

  @Column({ type: 'varchar', length: 191 })
  userId!: string

  @Column({ type: 'varchar', length: 191 })
  action!: string

  @Column({ type: 'varchar', length: 191 })
  entity!: string

  @Column({ type: 'varchar', length: 191 })
  entityId!: string

  @Column({ type: 'datetime' })
  createdAt!: Date
}

import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm'

export type AuditAction = 'create' | 'update' | 'delete' | 'login' | 'logout' | 'moderate' | 'toggle' | 'import'

@Entity({ name: 'audit_logs' })
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ type: 'varchar', length: 50 })
  action!: string

  @Column({ type: 'varchar', length: 50 })
  entity_type!: string

  @Column({ type: 'varchar', length: 36, nullable: true })
  entity_id?: string | null

  @Column({ type: 'text', nullable: true })
  summary?: string | null

  @Column({ type: 'varchar', length: 100, nullable: true })
  admin_username?: string | null

  @Column({ type: 'varchar', length: 45, nullable: true })
  ip_address?: string | null

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  created_at!: Date
}

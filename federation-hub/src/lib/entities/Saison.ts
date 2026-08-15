import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm'
import { League } from './League'

@Entity({ name: 'saisons' })
export class Saison {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ type: 'varchar', length: 255 })
  nom!: string

  @Column({ type: 'enum', enum: ['championnat', 'coupe', 'tournois'], default: 'championnat' })
  type_competition!: 'championnat' | 'coupe' | 'tournois'

  @ManyToOne(() => League, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'league_id' })
  league?: League | null

  @Column({ type: 'uuid', nullable: true })
  league_id?: string | null

  @Column({ type: 'date', nullable: true })
  date_debut?: string | null

  @Column({ type: 'date', nullable: true })
  date_fin?: string | null

  @Column({ type: 'boolean', name: 'requires_player_contract', default: false })
  requiresPlayerContract!: boolean

  @Column({ type: 'boolean', name: 'requires_staff_qualification', default: false })
  requiresStaffQualification!: boolean

  @Column({ type: 'enum', enum: ['CAF_PRO', 'CAF_A', 'CAF_B', 'CAF_C', 'NATIONAL', 'OTHER'], name: 'minimum_head_coach_qualification', nullable: true })
  minimumHeadCoachQualification?: 'CAF_PRO' | 'CAF_A' | 'CAF_B' | 'CAF_C' | 'NATIONAL' | 'OTHER' | null

  @Column({ type: 'boolean', name: 'requires_stadium_approval', default: false })
  requiresStadiumApproval!: boolean

  @Column({ type: 'boolean', name: 'requires_financial_compliance', default: false })
  requiresFinancialCompliance!: boolean

  @Column({ type: 'boolean', name: 'requires_medical_clearance', default: false })
  requiresMedicalClearance!: boolean

  @Column({ type: 'decimal', precision: 12, scale: 3, nullable: true, name: 'competition_entry_fee' })
  competitionEntryFee?: string | null

  @Column({ type: 'timestamp', nullable: true })
  created_at?: Date

}

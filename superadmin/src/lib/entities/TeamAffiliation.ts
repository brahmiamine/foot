import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'
import { Team } from './Team'
import { Federation } from './Federation'
import { League } from './League'
import { Saison } from './Saison'

export type TeamAffiliationStatus = 'ACTIVE' | 'ENDED' | 'SUSPENDED'

/**
 * migration.md §6 : historique de rattachement d'un club à une fédération/
 * ligue/saison, remplaçant progressivement `teams.federation_id` (lien
 * courant, non historisé — voir db/foot.sql) comme source de vérité pour
 * tout ce qui doit rester correct après un changement de ligue (promotion/
 * relégation, désaffiliation).
 *
 * Pas de `competition_id` : ce dépôt ne modélise pas de table Competition
 * séparée — `Saison.type_competition` (championnat/coupe/tournois) en
 * tient déjà lieu (voir superadmin/src/lib/entities/Saison.ts). Rattacher
 * une affiliation à `saisonId` suffit donc à retrouver la compétition.
 *
 * Invariant applicatif (pas une contrainte SQL — voir migration
 * superadmin/mysql/migration_add_team_affiliations.sql) : au plus une
 * affiliation `ACTIVE` par club à la fois, appliqué par
 * src/lib/teamAffiliations.ts (changeAffiliation), jamais par un simple
 * INSERT direct sur cette table.
 */
@Entity({ name: 'team_affiliations' })
export class TeamAffiliation {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @ManyToOne(() => Team, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'team_id' })
  team?: Team

  @Column({ type: 'uuid', name: 'team_id' })
  teamId!: string

  @ManyToOne(() => Federation, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'federation_id' })
  federation?: Federation

  @Column({ type: 'uuid', name: 'federation_id' })
  federationId!: string

  @ManyToOne(() => League, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'league_id' })
  league?: League | null

  @Column({ type: 'uuid', name: 'league_id', nullable: true })
  leagueId?: string | null

  @ManyToOne(() => Saison, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'saison_id' })
  saison?: Saison | null

  @Column({ type: 'uuid', name: 'saison_id', nullable: true })
  saisonId?: string | null

  @Column({ type: 'enum', enum: ['ACTIVE', 'ENDED', 'SUSPENDED'], default: 'ACTIVE' })
  status!: TeamAffiliationStatus

  @Column({ type: 'date', name: 'start_date' })
  startDate!: string

  @Column({ type: 'date', name: 'end_date', nullable: true })
  endDate?: string | null

  @Column({ type: 'text', nullable: true })
  notes?: string | null

  @Column({ type: 'varchar', length: 191, name: 'created_by', nullable: true })
  createdBy?: string | null

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date
}

import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import { DigestMode } from '../../common/enums/digest-mode.enum';

/**
 * Horaire de notification par utilisateur (NOTIF-002 heures calmes/timezone,
 * NOTIF-003 mode de digest). `quietHoursStart`/`quietHoursEnd` sont au
 * format 'HH:mm', interprétés dans `timezone` ; NULL désactive les heures
 * calmes. Absence de ligne = comportement par défaut (voir DEFAULT_SCHEDULE) :
 * pas d'heures calmes, digest IMMEDIATE.
 */
@Entity('notification_schedules')
export class NotificationSchedule {
  @PrimaryColumn({ type: 'varchar', length: 191, name: 'user_id' })
  userId!: string;

  @Column({ type: 'varchar', length: 64 })
  timezone!: string;

  @Column({
    type: 'varchar',
    length: 5,
    nullable: true,
    name: 'quiet_hours_start',
  })
  quietHoursStart!: string | null;

  @Column({
    type: 'varchar',
    length: 5,
    nullable: true,
    name: 'quiet_hours_end',
  })
  quietHoursEnd!: string | null;

  @Column({
    type: 'enum',
    enum: DigestMode,
    default: DigestMode.IMMEDIATE,
    name: 'digest_mode',
  })
  digestMode!: DigestMode;

  @UpdateDateColumn({ type: 'datetime', name: 'updated_at' })
  updatedAt!: Date;
}

import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import { NotificationLocale } from '../../common/enums/locale.enum';

/**
 * Langue préférée de l'utilisateur pour ses notifications (§14, §33). Ne
 * duplique pas une préférence de langue applicative générale : c'est une
 * donnée propre au Notification API, l'utilisateur pouvant vouloir des
 * notifications dans une langue différente de l'UI d'une app donnée.
 */
@Entity('notification_user_locales')
export class UserLocale {
  @PrimaryColumn({ type: 'varchar', length: 191, name: 'user_id' })
  userId!: string;

  @Column({ type: 'enum', enum: NotificationLocale })
  locale!: NotificationLocale;

  @UpdateDateColumn({ type: 'datetime', name: 'updated_at' })
  updatedAt!: Date;
}

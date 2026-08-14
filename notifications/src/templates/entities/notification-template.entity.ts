import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { NotificationChannelType } from '../../common/enums/channel.enum';
import { NotificationLocale } from '../../common/enums/locale.enum';

/**
 * Gabarit de rendu par (type, canal, langue) — §14. `body`/`subject`
 * supportent des variables Handlebars ({{firstName}}, {{matchDate}}, …)
 * résolues par TemplatesService à partir de `Notification.data` et du
 * contact du destinataire. Absence de template pour un (type, canal, locale)
 * donné : TemplatesService retombe sur `Notification.title`/`body` bruts,
 * pour qu'une application puisse introduire un nouveau `type` sans jamais
 * avoir à toucher au Notification API (§7, §32).
 */
@Entity('notification_templates')
@Unique(['type', 'channel', 'locale'])
@Index(['type'])
export class NotificationTemplate {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 128 })
  type!: string;

  @Column({ type: 'enum', enum: NotificationChannelType })
  channel!: NotificationChannelType;

  @Column({ type: 'enum', enum: NotificationLocale })
  locale!: NotificationLocale;

  /** Utilisé pour EMAIL uniquement (objet du message). */
  @Column({ type: 'varchar', length: 255, nullable: true })
  subject!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  title!: string | null;

  @Column({ type: 'text' })
  body!: string;

  @CreateDateColumn({ type: 'datetime', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'datetime', name: 'updated_at' })
  updatedAt!: Date;
}

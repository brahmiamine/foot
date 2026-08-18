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
import { TemplateStatus } from '../../common/enums/template-status.enum';

/**
 * Gabarit de rendu par (type, canal, langue) — §14. `body`/`subject`
 * supportent des variables Handlebars ({{firstName}}, {{matchDate}}, …)
 * résolues par TemplatesService à partir de `Notification.data` et du
 * contact du destinataire. Absence de template ACTIVE pour un (type, canal,
 * locale) donné : TemplatesService retombe sur `Notification.title`/`body`
 * bruts, pour qu'une application puisse introduire un nouveau `type` sans
 * jamais avoir à toucher au Notification API (§7, §32).
 *
 * NOTIF-005 : chaque ligne est UNE version figée d'un gabarit — au plus une
 * version ACTIVE par (type, channel, locale) à un instant donné (appliqué en
 * code par `TemplatesService`, pas par une contrainte DB, MySQL ne
 * supportant pas d'index unique partiel portable). L'historique
 * DRAFT/SUBMITTED/APPROVED/ACTIVE/ARCHIVED est conservé plutôt qu'écrasé.
 */
@Entity('notification_templates')
@Unique(['type', 'channel', 'locale', 'version'])
@Index(['type'])
@Index(['type', 'channel', 'locale', 'status'])
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

  @Column({ type: 'enum', enum: TemplateStatus, default: TemplateStatus.DRAFT })
  status!: TemplateStatus;

  @Column({ type: 'int', default: 1 })
  version!: number;

  @Column({ type: 'varchar', length: 191, nullable: true, name: 'created_by' })
  createdBy!: string | null;

  @Column({
    type: 'varchar',
    length: 191,
    nullable: true,
    name: 'submitted_by',
  })
  submittedBy!: string | null;

  @Column({ type: 'varchar', length: 191, nullable: true, name: 'approved_by' })
  approvedBy!: string | null;

  @Column({ type: 'datetime', nullable: true, name: 'activated_at' })
  activatedAt!: Date | null;

  @CreateDateColumn({ type: 'datetime', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'datetime', name: 'updated_at' })
  updatedAt!: Date;
}

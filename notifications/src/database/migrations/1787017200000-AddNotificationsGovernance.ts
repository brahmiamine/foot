import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * NOTIF-001..005 : NotificationPolicy organisationnelle, heures
 * calmes/timezone/digest par utilisateur, file d'agrégation des digests,
 * policy et trace d'escalade, et workflow/versionnement des templates.
 */
export class AddNotificationsGovernance1787017200000 implements MigrationInterface {
  name = 'AddNotificationsGovernance1787017200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS notification_policies (
        id varchar(36) NOT NULL,
        scope_type enum('PLATFORM','CLUB') NOT NULL,
        scope_id varchar(191) NULL,
        category varchar(128) NULL,
        version int NOT NULL,
        effective_from datetime NULL,
        effective_until datetime NULL,
        channels json NOT NULL,
        updated_by varchar(191) NOT NULL,
        created_at datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updated_at datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (id),
        INDEX IDX_notification_policies_scope_category (scope_type, scope_id, category)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS notification_policy_audit (
        id varchar(36) NOT NULL,
        domain varchar(80) NOT NULL,
        configuration_key varchar(120) NOT NULL,
        scope_type varchar(50) NOT NULL,
        scope_id varchar(191) NULL,
        previous_version int NULL,
        new_version int NOT NULL,
        before_value json NULL,
        after_value json NOT NULL,
        actor_user_id varchar(191) NOT NULL,
        actor_role varchar(50) NOT NULL,
        reason text NOT NULL,
        ip_address varchar(45) NULL,
        user_agent varchar(512) NULL,
        created_at datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        PRIMARY KEY (id),
        INDEX IDX_notification_policy_audit_domain_key (domain, configuration_key)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS notification_schedules (
        user_id varchar(191) NOT NULL,
        timezone varchar(64) NOT NULL,
        quiet_hours_start varchar(5) NULL,
        quiet_hours_end varchar(5) NULL,
        digest_mode enum('IMMEDIATE','HOURLY','DAILY') NOT NULL DEFAULT 'IMMEDIATE',
        updated_at datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS notification_digest_queue (
        id varchar(36) NOT NULL,
        user_id varchar(191) NOT NULL,
        channel enum('IN_APP','EMAIL','PUSH','SMS') NOT NULL,
        mode enum('IMMEDIATE','HOURLY','DAILY') NOT NULL,
        window_start datetime NOT NULL,
        notification_id varchar(36) NOT NULL,
        delivery_id varchar(36) NOT NULL,
        flushed tinyint NOT NULL DEFAULT 0,
        created_at datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        PRIMARY KEY (id),
        INDEX IDX_notification_digest_queue_group (user_id, channel, mode, window_start),
        INDEX IDX_notification_digest_queue_due (mode, flushed, window_start)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS notification_escalation_policies (
        id varchar(36) NOT NULL,
        scope_type enum('PLATFORM','CLUB') NOT NULL,
        scope_id varchar(191) NULL,
        category varchar(128) NULL,
        version int NOT NULL,
        effective_from datetime NULL,
        effective_until datetime NULL,
        enabled tinyint NOT NULL,
        delay_minutes int NOT NULL,
        backup_user_id varchar(191) NULL,
        backup_role varchar(50) NULL,
        updated_by varchar(191) NOT NULL,
        created_at datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updated_at datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (id),
        INDEX IDX_notification_escalation_policies_scope_category (scope_type, scope_id, category)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS notification_escalations (
        id varchar(36) NOT NULL,
        notification_id varchar(36) NOT NULL,
        backup_user_id varchar(191) NULL,
        escalated_notification_id varchar(36) NULL,
        escalated_at datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        PRIMARY KEY (id),
        UNIQUE INDEX UQ_notification_escalations_notification (notification_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await queryRunner.query(`
      ALTER TABLE notification_templates
        ADD COLUMN status enum('DRAFT','SUBMITTED','APPROVED','ACTIVE','ARCHIVED') NOT NULL DEFAULT 'DRAFT',
        ADD COLUMN version int NOT NULL DEFAULT 1,
        ADD COLUMN created_by varchar(191) NULL,
        ADD COLUMN submitted_by varchar(191) NULL,
        ADD COLUMN approved_by varchar(191) NULL,
        ADD COLUMN activated_at datetime NULL
    `);

    // Toute ligne pré-existante était de facto la version live : elle devient
    // ACTIVE plutôt que DRAFT, pour ne rien changer au comportement observé
    // par TemplatesService.render() (§NOTIF-005).
    await queryRunner.query(`
      UPDATE notification_templates
        SET status = 'ACTIVE', activated_at = created_at
        WHERE status = 'DRAFT'
    `);

    await queryRunner.query(`
      ALTER TABLE notification_templates
        DROP INDEX UQ_notification_templates_type_channel_locale
    `);
    await queryRunner.query(`
      ALTER TABLE notification_templates
        ADD UNIQUE INDEX UQ_notification_templates_type_channel_locale_version (type, channel, locale, version)
    `);
    await queryRunner.query(`
      ALTER TABLE notification_templates
        ADD INDEX IDX_notification_templates_type_channel_locale_status (type, channel, locale, status)
    `);
  }

  public down(): Promise<void> {
    return Promise.reject(
      new Error(
        'AddNotificationsGovernance cannot be reverted safely (would drop template workflow history and governance tables holding production audit data).',
      ),
    );
  }
}

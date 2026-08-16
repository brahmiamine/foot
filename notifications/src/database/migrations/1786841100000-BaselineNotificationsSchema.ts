import { MigrationInterface, QueryRunner } from 'typeorm';

/** Non-destructive baseline for the standalone notifications database. */
export class BaselineNotificationsSchema1786841100000 implements MigrationInterface {
  name = 'BaselineNotificationsSchema1786841100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id varchar(36) NOT NULL,
        user_id varchar(191) NOT NULL,
        team_id varchar(191) NULL,
        application varchar(64) NOT NULL,
        type varchar(128) NOT NULL,
        category varchar(128) NOT NULL,
        priority enum('LOW','NORMAL','HIGH','URGENT') NOT NULL DEFAULT 'NORMAL',
        title varchar(255) NOT NULL,
        body text NOT NULL,
        data json NULL,
        channels json NOT NULL,
        mandatory tinyint NOT NULL DEFAULT 0,
        notification_event_id varchar(36) NULL,
        read_at datetime NULL,
        expires_at datetime NULL,
        scheduled_at datetime NULL,
        created_at datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updated_at datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (id),
        INDEX IDX_notifications_user (user_id),
        INDEX IDX_notifications_team (team_id),
        INDEX IDX_notifications_application (application),
        INDEX IDX_notifications_type (type),
        INDEX IDX_notifications_read_at (read_at),
        INDEX IDX_notifications_user_read (user_id, read_at),
        INDEX IDX_notifications_user_created (user_id, created_at),
        INDEX IDX_notifications_team_created (team_id, created_at),
        INDEX IDX_notifications_app_type (application, type)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS notification_deliveries (
        id varchar(36) NOT NULL,
        notification_id varchar(36) NOT NULL,
        channel enum('IN_APP','EMAIL','PUSH','SMS') NOT NULL,
        provider varchar(64) NULL,
        status enum('PENDING','SENT','DELIVERED','FAILED','SKIPPED') NOT NULL DEFAULT 'PENDING',
        attempt int NOT NULL DEFAULT 0,
        sent_at datetime NULL,
        delivered_at datetime NULL,
        error text NULL,
        created_at datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updated_at datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (id),
        INDEX IDX_notification_deliveries_notification (notification_id),
        INDEX IDX_notification_deliveries_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS notification_events (
        id varchar(36) NOT NULL,
        application varchar(64) NOT NULL,
        event_id varchar(191) NOT NULL,
        type varchar(128) NOT NULL,
        notification_ids json NOT NULL,
        created_at datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        PRIMARY KEY (id),
        INDEX IDX_notification_events_application (application),
        UNIQUE INDEX UQ_notification_events_application_event (application, event_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS notification_preferences (
        id varchar(36) NOT NULL,
        user_id varchar(191) NOT NULL,
        category varchar(128) NOT NULL,
        channel enum('IN_APP','EMAIL','PUSH','SMS') NOT NULL,
        enabled tinyint NOT NULL DEFAULT 1,
        created_at datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updated_at datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (id),
        INDEX IDX_notification_preferences_user (user_id),
        UNIQUE INDEX UQ_notification_preferences_user_category_channel (user_id, category, channel)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS notification_user_locales (
        user_id varchar(191) NOT NULL,
        locale enum('fr','ar','en') NOT NULL,
        updated_at datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS notification_templates (
        id varchar(36) NOT NULL,
        type varchar(128) NOT NULL,
        channel enum('IN_APP','EMAIL','PUSH','SMS') NOT NULL,
        locale enum('fr','ar','en') NOT NULL,
        subject varchar(255) NULL,
        title varchar(255) NULL,
        body text NOT NULL,
        created_at datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updated_at datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (id),
        INDEX IDX_notification_templates_type (type),
        UNIQUE INDEX UQ_notification_templates_type_channel_locale (type, channel, locale)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS push_subscriptions (
        id varchar(36) NOT NULL,
        user_id varchar(191) NOT NULL,
        device_id varchar(191) NOT NULL,
        platform enum('WEB','IOS','ANDROID') NOT NULL,
        token text NULL,
        endpoint text NULL,
        p256dh varchar(255) NULL,
        auth varchar(255) NULL,
        created_at datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        last_used_at datetime NOT NULL,
        updated_at datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (id),
        INDEX IDX_push_subscriptions_user (user_id),
        UNIQUE INDEX UQ_push_subscriptions_user_device (user_id, device_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
  }

  public down(): Promise<void> {
    return Promise.reject(
      new Error(
        'BaselineNotificationsSchema cannot be reverted safely because it may have adopted pre-existing production tables.',
      ),
    );
  }
}

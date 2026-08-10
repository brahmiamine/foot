import { getDataSource } from "@/lib/database";
import { PlatformNotification } from "@/entities/PlatformNotification";
import { NotificationPreference } from "@/entities/NotificationPreference";
import { User } from "@/entities/User";
import { sendEmailOrThrow } from "@/lib/mailer";
import { In, IsNull, Repository } from "typeorm";

export interface NotifyInput {
  type: string;
  title: string;
  body: string;
  url?: string | null;
  teamId?: string | null;
  matchId?: string | null;
  isUrgent?: boolean;
  createdBy?: string | null;
}

const SOURCE_APP = "teamManager";

function renderEmailHtml(title: string, body: string, url?: string | null): string {
  const link = url ? `<p><a href="${url}">Voir dans l'application</a></p>` : "";
  return `<div style="font-family:Arial,sans-serif;line-height:1.5;"><h2>${title}</h2><p>${body.replace(/\n/g, "<br/>")}</p>${link}</div>`;
}

/**
 * Service de notifications centralisées (in-app + email), table partagée
 * avec matchsheet (`platform_notifications` / `notification_preferences`).
 * L'envoi d'email est synchrone (pas de file d'attente) : une erreur SMTP
 * est capturée et tracée dans `emailStatus`/`emailError` sans jamais faire
 * échouer l'action métier appelante. `retryFailedEmails` permet de rejouer
 * les échecs a posteriori (queue/retry complet avec BullMQ+Redis reste une
 * évolution possible, non nécessaire pour ce volume).
 */
export class PlatformNotificationService {
  private async getRepository(): Promise<Repository<PlatformNotification>> {
    const dataSource = await getDataSource();
    return dataSource.getRepository(PlatformNotification);
  }

  private async getPreferenceRepository(): Promise<Repository<NotificationPreference>> {
    const dataSource = await getDataSource();
    return dataSource.getRepository(NotificationPreference);
  }

  private async getUserRepository(): Promise<Repository<User>> {
    const dataSource = await getDataSource();
    return dataSource.getRepository(User);
  }

  /** Users actifs d'un club (ADMIN/OBSERVATEUR), destinataires par défaut d'une notification club-entier. */
  async resolveTeamUserIds(teamId: string, excludeUserId?: string): Promise<string[]> {
    const userRepository = await this.getUserRepository();
    const users = await userRepository.find({ where: { teamId, isActive: true } });
    return users.map((u) => u.id).filter((id) => id !== excludeUserId);
  }

  async notifyTeam(teamId: string, input: NotifyInput, options?: { excludeUserId?: string }): Promise<void> {
    const userIds = await this.resolveTeamUserIds(teamId, options?.excludeUserId);
    await this.notifyUsers(userIds, { ...input, teamId });
  }

  async notifyUsers(userIds: string[], input: NotifyInput): Promise<void> {
    const uniqueUserIds = Array.from(new Set(userIds));
    if (uniqueUserIds.length === 0) return;

    const repository = await this.getRepository();
    const userRepository = await this.getUserRepository();
    const users = await userRepository.find({ where: { id: In(uniqueUserIds) } });
    const usersById = new Map(users.map((u) => [u.id, u]));

    for (const userId of uniqueUserIds) {
      const notification = repository.create({
        userId,
        teamId: input.teamId ?? null,
        sourceApp: SOURCE_APP,
        type: input.type,
        title: input.title,
        body: input.body,
        url: input.url ?? null,
        matchId: input.matchId ?? null,
        isUrgent: input.isUrgent ?? false,
        createdBy: input.createdBy ?? null,
      });
      const saved = await repository.save(notification);

      const user = usersById.get(userId);
      if (user?.email) {
        await this.sendEmailForNotification(saved, user.email);
      } else {
        saved.emailStatus = "SKIPPED";
        await repository.save(saved);
      }
    }
  }

  private async sendEmailForNotification(notification: PlatformNotification, email: string): Promise<void> {
    const repository = await this.getRepository();
    const preference = await this.getPreference(notification.userId);
    if (!preference.emailEnabled) {
      notification.emailStatus = "SKIPPED";
      await repository.save(notification);
      return;
    }

    try {
      await sendEmailOrThrow({
        to: email,
        subject: notification.title,
        html: renderEmailHtml(notification.title, notification.body, notification.url),
      });
      notification.emailStatus = "SENT";
      notification.emailSentAt = new Date();
      notification.emailError = null;
    } catch (error) {
      notification.emailStatus = "FAILED";
      notification.emailError = error instanceof Error ? error.message.slice(0, 500) : "Erreur inconnue";
    }
    await repository.save(notification);
  }

  /** Rejoue les emails en échec (appelé manuellement/par une tâche planifiée). */
  async retryFailedEmails(limit = 50): Promise<number> {
    const repository = await this.getRepository();
    const userRepository = await this.getUserRepository();
    const failed = await repository.find({ where: { emailStatus: "FAILED" }, take: limit, order: { createdAt: "ASC" } });
    let retried = 0;
    for (const notification of failed) {
      const user = await userRepository.findOne({ where: { id: notification.userId } });
      if (user?.email) {
        await this.sendEmailForNotification(notification, user.email);
        retried++;
      }
    }
    return retried;
  }

  async list(userId: string, opts: { unreadOnly?: boolean; limit?: number; offset?: number } = {}): Promise<PlatformNotification[]> {
    const repository = await this.getRepository();
    return repository.find({
      where: { userId, ...(opts.unreadOnly ? { readAt: IsNull() } : {}) },
      order: { createdAt: "DESC" },
      take: opts.limit ?? 30,
      skip: opts.offset ?? 0,
    });
  }

  async countUnread(userId: string): Promise<number> {
    const repository = await this.getRepository();
    return repository.count({ where: { userId, readAt: IsNull() } });
  }

  async markRead(id: number, userId: string): Promise<void> {
    const repository = await this.getRepository();
    await repository.update({ id, userId, readAt: IsNull() }, { readAt: new Date() });
  }

  async markAllRead(userId: string): Promise<void> {
    const repository = await this.getRepository();
    await repository.update({ userId, readAt: IsNull() }, { readAt: new Date() });
  }

  async getPreference(userId: string): Promise<{ emailEnabled: boolean }> {
    const repository = await this.getPreferenceRepository();
    const preference = await repository.findOne({ where: { userId } });
    return { emailEnabled: preference?.emailEnabled ?? true };
  }

  async setPreference(userId: string, emailEnabled: boolean): Promise<void> {
    const repository = await this.getPreferenceRepository();
    const existing = await repository.findOne({ where: { userId } });
    if (existing) {
      existing.emailEnabled = emailEnabled;
      await repository.save(existing);
    } else {
      await repository.save(repository.create({ userId, emailEnabled }));
    }
  }
}

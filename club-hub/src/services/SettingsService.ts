import { randomUUID } from "node:crypto";
import { getDataSource } from "@/lib/database";
import { Settings } from "@/entities/Settings";
import { Repository } from "typeorm";

export interface SettingsInput {
  yellowsBeforeSuspend: number;
  redCard1Matches: number;
  redCard2Matches: number;
  redCard3Matches: number;
  yellowFineAmount: number;
  redFineAmount: number;
  fineDueDays: number;
  alertEmails: string;
}

/**
 * Service for Settings — réglages disciplinaires GLOBAUX (une seule ligne,
 * communs à tous les clubs, règlement FTF). Port de cardManager/app/api/settings.
 */
export class SettingsService {
  private async getRepository(): Promise<Repository<Settings>> {
    const dataSource = await getDataSource();
    return dataSource.getRepository(Settings);
  }

  /** Retourne la ligne de réglages, en créant les valeurs par défaut si absente. */
  async get(): Promise<Settings> {
    const repository = await this.getRepository();
    let settings = await repository.findOne({ where: {} });
    if (!settings) {
      settings = repository.create({ id: randomUUID(), alertEmails: "" });
      settings = await repository.save(settings);
    }
    return settings;
  }

  async update(data: SettingsInput): Promise<{ before: Settings | null; after: Settings }> {
    const repository = await this.getRepository();
    const before = await repository.findOne({ where: {} });

    let settings: Settings;
    if (before) {
      Object.assign(before, {
        ...data,
        yellowFineAmount: String(data.yellowFineAmount),
        redFineAmount: String(data.redFineAmount),
      });
      settings = await repository.save(before);
    } else {
      settings = repository.create({
        id: randomUUID(),
        ...data,
        yellowFineAmount: String(data.yellowFineAmount),
        redFineAmount: String(data.redFineAmount),
      });
      settings = await repository.save(settings);
    }

    return { before, after: settings };
  }
}

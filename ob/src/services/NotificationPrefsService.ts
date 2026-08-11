import { getDataSource } from "@/lib/database";
import { ObNotificationPrefs } from "@/entities/ObNotificationPrefs";

const DEFAULTS = {
  matches: true,
  results: true,
  news: true,
  womenTeam: false,
  youth: false,
  favoritePlayers: true,
  shop: false,
  ticketing: false,
};

export class NotificationPrefsService {
  async getForUser(userId: string): Promise<typeof DEFAULTS> {
    const dataSource = await getDataSource();
    const row = await dataSource.getRepository(ObNotificationPrefs).findOne({ where: { userId } });
    if (!row) return DEFAULTS;
    return {
      matches: row.matches,
      results: row.results,
      news: row.news,
      womenTeam: row.womenTeam,
      youth: row.youth,
      favoritePlayers: row.favoritePlayers,
      shop: row.shop,
      ticketing: row.ticketing,
    };
  }
}

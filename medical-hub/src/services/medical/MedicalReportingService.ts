import type { InjuryDocument } from "@/entities/Injury";
import { MedicalInjuryService, type InjuryWithPlayer } from "./MedicalInjuryService";
import { parseInjuryDocuments, type CategoryScope } from "./MedicalServiceBase";

export interface AlertEntry extends InjuryWithPlayer {
  kind: "OVERDUE" | "RETURN_SOON";
  daysDiff: number;
}

export class MedicalReportingService extends MedicalInjuryService {
  async getDocuments(
    teamId: string,
    categories: CategoryScope,
  ): Promise<Array<InjuryWithPlayer & { document: InjuryDocument }>> {
    const injuries = await this.listInjuries(teamId, categories);
    const rows: Array<InjuryWithPlayer & { document: InjuryDocument }> = [];
    for (const { injury, player } of injuries) {
      for (const document of parseInjuryDocuments(injury.documents)) {
        rows.push({ injury, player, document });
      }
    }
    return rows;
  }

  async getUnavailablePlayers(teamId: string, categories: CategoryScope): Promise<InjuryWithPlayer[]> {
    return this.listInjuries(teamId, categories, ["ONGOING", "RECOVERING"]);
  }

  async getAlerts(teamId: string, categories: CategoryScope): Promise<AlertEntry[]> {
    const active = await this.listInjuries(teamId, categories, ["ONGOING", "RECOVERING"]);
    const now = Date.now();
    const alerts: AlertEntry[] = [];

    for (const { injury, player } of active) {
      if (!injury.expectedReturnDate) continue;
      const expected = new Date(injury.expectedReturnDate).getTime();
      const daysDiff = Math.round((expected - now) / (24 * 60 * 60 * 1000));
      if (daysDiff < 0) {
        alerts.push({ injury, player, kind: "OVERDUE", daysDiff });
      } else if (daysDiff <= 3) {
        alerts.push({ injury, player, kind: "RETURN_SOON", daysDiff });
      }
    }

    return alerts.sort((a, b) => a.daysDiff - b.daysDiff);
  }

  async getAvailabilitySummary(
    teamId: string,
    categories: CategoryScope,
  ): Promise<{ totalPlayers: number; available: number; ongoing: number; recovering: number }> {
    const roster = await this.rosterInCategories(teamId, categories);
    const unavailable = await this.getUnavailablePlayers(teamId, categories);
    const ongoing = unavailable.filter(({ injury }) => injury.status === "ONGOING").length;
    const recovering = unavailable.filter(({ injury }) => injury.status === "RECOVERING").length;
    return {
      totalPlayers: roster.length,
      available: roster.length - unavailable.length,
      ongoing,
      recovering,
    };
  }
}

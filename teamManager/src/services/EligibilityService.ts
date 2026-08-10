import { getDataSource } from "@/lib/database";
import { Suspension } from "@/entities/Suspension";
import { LicenseService } from "./LicenseService";
import { InjuryService } from "./InjuryService";

export type EligibilityReasonCode = "SUSPENDED" | "INJURED" | "LICENSE_MISSING" | "LICENSE_EXPIRED" | "LICENSE_INACTIVE";

export interface EligibilityReason {
  code: EligibilityReasonCode;
  label: string;
}

export interface PlayerEligibility {
  playerId: string;
  eligible: boolean;
  reasons: EligibilityReason[];
}

/**
 * EligibilityService — calcule (jamais stocké) si un joueur peut être
 * convoqué/aligné, à partir de : licence + suspension (table partagée
 * `Suspension`) + blessure (`cms_injuries.availability_status`). Ne stocke
 * jamais `eligible = true/false` sur le joueur : toujours recalculé selon
 * le contexte (joueur + date). Utilisée par la composition/convocations.
 */
export class EligibilityService {
  async getEligibility(playerId: string, teamId: string): Promise<PlayerEligibility> {
    const reasons: EligibilityReason[] = [];

    const dataSource = await getDataSource();
    const suspensionRepository = dataSource.getRepository(Suspension);
    const suspensions = await suspensionRepository.find({ where: { playerId, status: "ACTIVE" } });
    const isSuspended = suspensions.some((s) => {
      const total = s.overrideMatchesCount ?? s.matchesCount;
      return total - s.matchesPurged > 0;
    });
    if (isSuspended) {
      reasons.push({ code: "SUSPENDED", label: "Suspendu" });
    }

    const injuryService = new InjuryService();
    const injuries = await injuryService.findByPlayer(playerId, teamId);
    const activeInjury = injuries.find((i) => i.status !== "RESOLVED" && i.availabilityStatus !== "AVAILABLE");
    if (activeInjury) {
      reasons.push({ code: "INJURED", label: `Blessure (${activeInjury.zone})` });
    }

    const licenseService = new LicenseService();
    const license = await licenseService.findActiveForPlayer(playerId, teamId);
    if (!license) {
      reasons.push({ code: "LICENSE_MISSING", label: "Aucune licence enregistrée" });
    } else if (license.status === "EXPIRED" || (license.expiresAt && new Date(license.expiresAt) < new Date())) {
      reasons.push({ code: "LICENSE_EXPIRED", label: "Licence expirée" });
    } else if (license.status !== "ACTIVE") {
      reasons.push({ code: "LICENSE_INACTIVE", label: "Licence non active" });
    }

    return { playerId, eligible: reasons.length === 0, reasons };
  }

  async getEligibilityForPlayers(playerIds: string[], teamId: string): Promise<Map<string, PlayerEligibility>> {
    const entries = await Promise.all(playerIds.map(async (id) => [id, await this.getEligibility(id, teamId)] as const));
    return new Map(entries);
  }
}

import { LicenseService } from "./LicenseService";
import { DocumentService } from "./DocumentService";

export type ExpiringItemSource = "LICENSE" | "DOCUMENT";

export interface ExpiringItem {
  source: ExpiringItemSource;
  id: number;
  label: string;
  entityType: string;
  entityId: string;
  expiresAt: string;
  isExpired: boolean;
}

/**
 * Service agrégeant les échéances du club — licences (`cms_licenses.
 * expires_at`) et documents génériques (`cms_documents.expires_at`) — dans
 * une seule liste triée, pour un tableau de bord d'échéances unique.
 * Ne modifie ni ne duplique les données sources : lecture agrégée
 * uniquement.
 */
export class ExpirationService {
  async getExpiringItems(teamId: string, withinDays: number = 60): Promise<ExpiringItem[]> {
    const licenseService = new LicenseService();
    const documentService = new DocumentService();

    const [licenses, documents] = await Promise.all([licenseService.findAll(teamId), documentService.findExpiring(teamId, withinDays)]);

    const today = new Date().toISOString().slice(0, 10);
    const limit = new Date();
    limit.setDate(limit.getDate() + withinDays);
    const limitStr = limit.toISOString().slice(0, 10);

    const items: ExpiringItem[] = [];

    for (const license of licenses) {
      if (!license.expiresAt || license.expiresAt > limitStr) continue;
      items.push({
        source: "LICENSE",
        id: license.id,
        label: `Licence ${license.holderType === "PLAYER" ? license.player?.firstNameFr + " " + license.player?.lastNameFr : license.staff?.firstNameFr + " " + license.staff?.lastNameFr}`,
        entityType: license.holderType,
        entityId: license.holderType === "PLAYER" ? (license.playerId ?? "") : String(license.staffId ?? ""),
        expiresAt: license.expiresAt,
        isExpired: license.expiresAt < today,
      });
    }

    for (const document of documents) {
      if (!document.expiresAt) continue;
      items.push({
        source: "DOCUMENT",
        id: document.id,
        label: document.title,
        entityType: document.entityType,
        entityId: document.entityId,
        expiresAt: document.expiresAt,
        isExpired: document.expiresAt < today,
      });
    }

    return items.sort((a, b) => a.expiresAt.localeCompare(b.expiresAt));
  }
}

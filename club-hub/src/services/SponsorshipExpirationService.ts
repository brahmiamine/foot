import { LessThanOrEqual } from "typeorm";
import { getDataSource } from "@/lib/database";
import { Sponsor } from "@/entities/Sponsor";
import { SponsorRequest } from "@/entities/SponsorRequest";
import { SponsorWorkflowEvent } from "@/entities/SponsorshipGovernance";

export interface SponsorshipExpirationResult {
  processed: number;
  sponsorIds: number[];
}

/**
 * Intégrité contractuelle globale : ne dépend pas de l'ouverture de l'écran
 * admin et ne réactive jamais un module désactivé. L'expiration reste une
 * règle de données, exécutée par le scheduler interne authentifié.
 */
export class SponsorshipExpirationService {
  async processDue(now: Date = new Date(), limit = 100): Promise<SponsorshipExpirationResult> {
    const ds = await getDataSource();
    const today = now.toISOString().slice(0, 10);
    const due = await ds.getRepository(Sponsor).find({
      where: {
        workflowStatus: "ACTIVE",
        contractEnd: LessThanOrEqual(today),
      },
      order: { contractEnd: "ASC" },
      take: Math.max(1, Math.min(limit, 500)),
    });

    const sponsorIds: number[] = [];
    for (const candidate of due) {
      const changed = await ds.transaction(async (manager) => {
        const sponsorRepo = manager.getRepository(Sponsor);
        const requestRepo = manager.getRepository(SponsorRequest);
        const eventRepo = manager.getRepository(SponsorWorkflowEvent);
        const sponsor = await sponsorRepo.findOne({
          where: { id: candidate.id, teamId: candidate.teamId },
          lock: { mode: "pessimistic_write" },
        });
        if (
          !sponsor ||
          sponsor.workflowStatus !== "ACTIVE" ||
          !sponsor.contractEnd ||
          sponsor.contractEnd > today
        ) {
          return false;
        }

        sponsor.workflowStatus = "EXPIRED";
        sponsor.isActive = false;
        sponsor.expiredAt = now;
        await sponsorRepo.save(sponsor);

        if (sponsor.sponsorRequestId) {
          const request = await requestRepo.findOne({
            where: { id: sponsor.sponsorRequestId, teamId: sponsor.teamId },
          });
          if (request) {
            request.status = "EXPIRED";
            await requestRepo.save(request);
          }
        }

        await eventRepo.save(
          eventRepo.create({
            teamId: sponsor.teamId,
            sponsorRequestId: sponsor.sponsorRequestId ?? null,
            sponsorId: sponsor.id,
            actorUserId: "SYSTEM",
            transition: "EXPIRE_SPONSOR",
            fromStatus: "ACTIVE",
            toStatus: "EXPIRED",
            details: JSON.stringify({ expiredAt: now.toISOString(), contractEnd: sponsor.contractEnd }),
          }),
        );
        return true;
      });
      if (changed) sponsorIds.push(candidate.id);
    }

    return { processed: sponsorIds.length, sponsorIds };
  }
}

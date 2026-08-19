import { In } from "typeorm";
import {
  ClubApprovalDecision,
  type ClubApprovalDomain,
  type ClubApprovalRequest,
} from "@/entities/ClubGovernance";
import { can, type UserAccess } from "@/lib/access";
import { getDataSource } from "@/lib/database";
import { AnnouncementService } from "@/services/AnnouncementService";
import { ClubApprovalService } from "@/services/ClubApprovalService";
import { NewsService } from "@/services/NewsService";
import { ProductService } from "@/services/ProductService";
import {
  sortActionItems,
  type ActionItem,
} from "../../../packages/domain-contracts/src/action-item";

function canReview(domain: ClubApprovalDomain, access: UserAccess): boolean {
  if (domain === "NEWS") return can(access, "news.publish");
  if (domain === "ANNOUNCEMENT") return can(access, "announcements.manage");
  return can(access, "shop.manage");
}

function isActionableBy(request: ClubApprovalRequest, access: UserAccess): boolean {
  if (!canReview(request.domain, access)) return false;
  if (request.makerCheckerEnabled && request.makerUserId === access.userId) return false;
  return true;
}

async function entityLabel(
  domain: ClubApprovalDomain,
  entityId: string,
  teamId: string,
): Promise<string> {
  if (domain === "NEWS") {
    const item = await new NewsService().findById(Number(entityId), teamId);
    return item?.title ?? `Actualité #${entityId}`;
  }
  if (domain === "ANNOUNCEMENT") {
    const item = await new AnnouncementService().findById(Number(entityId), teamId);
    return item?.title ?? `Communiqué #${entityId}`;
  }
  const item = await new ProductService().findById(Number(entityId), teamId);
  return item?.nameFr ?? `Produit #${entityId}`;
}

export class ActionDashboardService {
  async listForUser(teamId: string, access: UserAccess): Promise<ActionItem[]> {
    if (access.teamId !== teamId) {
      throw new Error("Action non autorisée : club hors de votre périmètre");
    }

    const permittedRequests = (await new ClubApprovalService().listPending(teamId)).filter(
      (request) => isActionableBy(request, access),
    );
    if (permittedRequests.length === 0) return [];

    const dataSource = await getDataSource();
    const previousDecisions = await dataSource.getRepository(ClubApprovalDecision).find({
      where: {
        actorUserId: access.userId,
        requestId: In(permittedRequests.map((request) => request.id)),
      },
      select: { requestId: true },
    });
    const alreadyDecided = new Set(previousDecisions.map((decision) => decision.requestId));
    const requests = permittedRequests.filter((request) => !alreadyDecided.has(request.id));

    const items = await Promise.all(
      requests.map(async (request): Promise<ActionItem> => ({
        id: `club-approval:${request.id}`,
        domain: "CLUB_APPROVAL",
        entityId: request.entityId,
        title: await entityLabel(request.domain, request.entityId, teamId),
        description:
          request.approvalMode === "DUAL_APPROVAL"
            ? `${request.domain} · double approbation`
            : `${request.domain} · approbation simple`,
        href: "/admin/approvals",
        requestedAt: request.createdAt.toISOString(),
        dueAt: null,
        priority: "NORMAL",
        scope: { teamId },
      })),
    );
    return sortActionItems(items);
  }
}

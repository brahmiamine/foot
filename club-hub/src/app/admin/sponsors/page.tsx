import { can, getUserAccess, requirePermission } from "@/lib/access";
import { requireTeamId } from "@/lib/team-context";
import { SponsorService } from "@/services/SponsorService";
import { SponsorshipQueryService } from "@/services/SponsorshipQueryService";
import { SponsorshipWorkflowService } from "@/services/SponsorshipWorkflowService";
import { SponsorsManagement } from "./SponsorsManagement";

export const dynamic = "force-dynamic";

/** Page Sponsors — demandes, contrats, approbations et dossiers actifs. */
export default async function SponsorsPage() {
  const access = await getUserAccess();
  requirePermission(access, "sponsors.view");
  const teamId = await requireTeamId();
  if (access.teamId !== teamId) throw new Error("Accès interdit : contexte club incohérent");

  const sponsorService = new SponsorService();
  const workflow = new SponsorshipWorkflowService();
  const query = new SponsorshipQueryService();

  const [requestsData, sponsorsData, governance, approvalsData] = await Promise.all([
    sponsorService.findAllRequests(teamId),
    sponsorService.findAllSponsors(teamId),
    workflow.getGovernanceSettings(teamId),
    query.listPendingApprovals(teamId),
  ]);

  const requests = requestsData.map((request) => ({
    id: request.id,
    companyName: request.companyName,
    contactName: request.contactName,
    email: request.email,
    phone: request.phone ?? null,
    website: request.website ?? null,
    logoUrl: request.logoUrl ?? null,
    logoSize: request.logoSize ?? null,
    proposedLevel: request.proposedLevel ?? null,
    message: request.message ?? null,
    status: request.status,
    adminNotes: request.adminNotes ?? null,
    reviewedAt: request.reviewedAt?.toISOString() ?? null,
    negotiationNotes: request.negotiationNotes ?? null,
    negotiationStartedAt: request.negotiationStartedAt?.toISOString() ?? null,
    refusalReason: request.refusalReason ?? null,
    createdAt: request.createdAt.toISOString(),
  }));

  const sponsors = sponsorsData.map((sponsor) => ({
    id: sponsor.id,
    sponsorRequestId: sponsor.sponsorRequestId ?? null,
    companyName: sponsor.companyName,
    logoUrl: sponsor.logoUrl ?? null,
    logoSize: sponsor.logoSize,
    website: sponsor.website ?? null,
    level: sponsor.level,
    logoPlacement: sponsor.logoPlacement ? sponsor.logoPlacement.split(",").filter(Boolean) : [],
    contractStart: sponsor.contractStart ?? null,
    contractEnd: sponsor.contractEnd ?? null,
    contractAmount:
      sponsor.contractAmount !== null && sponsor.contractAmount !== undefined ? Number(sponsor.contractAmount) : null,
    workflowStatus: sponsor.workflowStatus,
    contractDraftedAt: sponsor.contractDraftedAt?.toISOString() ?? null,
    activatedAt: sponsor.activatedAt?.toISOString() ?? null,
    expiredAt: sponsor.expiredAt?.toISOString() ?? null,
    isActive: sponsor.isActive,
    createdAt: sponsor.createdAt.toISOString(),
  }));

  const approvals = approvalsData.map((approval) => ({
    ...approval,
    createdAt: approval.createdAt.toISOString(),
  }));

  return (
    <SponsorsManagement
      initialRequests={requests}
      initialSponsors={sponsors}
      pendingApprovals={approvals}
      governance={governance}
      teamId={teamId}
      canManage={can(access, "sponsors.manage")}
    />
  );
}

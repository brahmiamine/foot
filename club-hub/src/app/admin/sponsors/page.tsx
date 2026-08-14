import { requireTeamId } from "@/lib/team-context";
import { SponsorService } from "@/services/SponsorService";
import { SponsorsManagement } from "./SponsorsManagement";

export const dynamic = "force-dynamic";

/** Page Sponsors — dossiers de partenariat (demandes à traiter + sponsors actifs). */
export default async function SponsorsPage() {
  const teamId = await requireTeamId();
  const sponsorService = new SponsorService();

  const [requestsData, sponsorsData] = await Promise.all([
    sponsorService.findAllRequests(teamId),
    sponsorService.findAllSponsors(teamId),
  ]);

  const requests = requestsData.map((r) => ({
    id: r.id,
    companyName: r.companyName,
    contactName: r.contactName,
    email: r.email,
    phone: r.phone ?? null,
    website: r.website ?? null,
    logoUrl: r.logoUrl ?? null,
    logoSize: r.logoSize ?? null,
    proposedLevel: r.proposedLevel ?? null,
    message: r.message ?? null,
    status: r.status,
    adminNotes: r.adminNotes ?? null,
    reviewedAt: r.reviewedAt ? r.reviewedAt.toISOString() : null,
    createdAt: r.createdAt.toISOString(),
  }));

  const sponsors = sponsorsData.map((s) => ({
    id: s.id,
    companyName: s.companyName,
    logoUrl: s.logoUrl ?? null,
    logoSize: s.logoSize,
    website: s.website ?? null,
    level: s.level,
    logoPlacement: s.logoPlacement ? s.logoPlacement.split(",").filter(Boolean) : [],
    contractStart: s.contractStart ?? null,
    contractEnd: s.contractEnd ?? null,
    contractAmount: s.contractAmount !== null && s.contractAmount !== undefined ? Number(s.contractAmount) : null,
    isActive: s.isActive,
    createdAt: s.createdAt.toISOString(),
  }));

  return <SponsorsManagement initialRequests={requests} initialSponsors={sponsors} teamId={teamId} />;
}

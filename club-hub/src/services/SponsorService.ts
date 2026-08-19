import { getDataSource } from "@/lib/database";
import { SponsorRequest, SponsorLevel, SponsorLogoSize, SponsorRequestStatus } from "@/entities/SponsorRequest";
import { Sponsor } from "@/entities/Sponsor";
import { Repository } from "typeorm";
import { ClubFeatureSettingsService } from "./ClubFeatureSettingsService";

interface CreateSponsorRequestData {
  companyName: string;
  contactName: string;
  email: string;
  phone?: string | null;
  website?: string | null;
  logoUrl?: string | null;
  logoSize?: SponsorLogoSize | null;
  proposedLevel?: SponsorLevel | null;
  message?: string | null;
}

interface AcceptSponsorRequestData {
  level: SponsorLevel;
  logoSize: SponsorLogoSize;
  logoPlacement: string[];
  contractStart?: string | null;
  contractEnd?: string | null;
  contractAmount?: number | null;
  adminNotes?: string | null;
}

interface UpdateSponsorData {
  companyName?: string;
  logoUrl?: string | null;
  logoSize?: SponsorLogoSize;
  website?: string | null;
  level?: SponsorLevel;
  logoPlacement?: string[];
  contractStart?: string | null;
  contractEnd?: string | null;
  contractAmount?: number | null;
  isActive?: boolean;
}

/** Sponsor / SponsorRequest operations, serveur-gardées par GOV-010. */
export class SponsorService {
  private async assertEnabled(teamId: string): Promise<void> {
    await new ClubFeatureSettingsService().assertEnabled(teamId, "SPONSORING");
  }

  private async getRequestRepository(): Promise<Repository<SponsorRequest>> {
    const dataSource = await getDataSource();
    return dataSource.getRepository(SponsorRequest);
  }

  private async getSponsorRepository(): Promise<Repository<Sponsor>> {
    const dataSource = await getDataSource();
    return dataSource.getRepository(Sponsor);
  }

  async findAllRequests(teamId: string, status?: SponsorRequestStatus): Promise<SponsorRequest[]> {
    await this.assertEnabled(teamId);
    const repository = await this.getRequestRepository();
    return repository.find({
      where: status ? { teamId, status } : { teamId },
      order: { createdAt: "DESC" },
    });
  }

  async findRequestById(id: number, teamId: string): Promise<SponsorRequest | null> {
    await this.assertEnabled(teamId);
    const repository = await this.getRequestRepository();
    return repository.findOne({ where: { id, teamId } });
  }

  async createRequest(data: CreateSponsorRequestData, teamId: string): Promise<SponsorRequest> {
    await this.assertEnabled(teamId);
    const repository = await this.getRequestRepository();
    const request = repository.create({ ...data, teamId, status: "PENDING" });
    return repository.save(request);
  }

  async acceptRequest(id: number, teamId: string, data: AcceptSponsorRequestData, reviewedBy: string | null): Promise<Sponsor> {
    await this.assertEnabled(teamId);
    const requestRepository = await this.getRequestRepository();
    const sponsorRepository = await this.getSponsorRepository();

    const request = await requestRepository.findOne({ where: { id, teamId } });
    if (!request) throw new Error("Demande non trouvée");
    if (request.status !== "PENDING") throw new Error("Cette demande a déjà été traitée");

    const sponsor = sponsorRepository.create({
      teamId,
      sponsorRequestId: request.id,
      companyName: request.companyName,
      logoUrl: request.logoUrl,
      logoSize: data.logoSize,
      website: request.website,
      level: data.level,
      logoPlacement: data.logoPlacement.join(","),
      contractStart: data.contractStart ?? null,
      contractEnd: data.contractEnd ?? null,
      contractAmount: data.contractAmount !== undefined && data.contractAmount !== null ? String(data.contractAmount) : null,
      isActive: true,
    });
    const savedSponsor = await sponsorRepository.save(sponsor);

    request.status = "ACCEPTED";
    request.adminNotes = data.adminNotes ?? null;
    request.reviewedBy = reviewedBy;
    request.reviewedAt = new Date();
    await requestRepository.save(request);
    return savedSponsor;
  }

  async refuseRequest(id: number, teamId: string, adminNotes: string, reviewedBy: string | null): Promise<SponsorRequest> {
    await this.assertEnabled(teamId);
    const repository = await this.getRequestRepository();
    const request = await repository.findOne({ where: { id, teamId } });
    if (!request) throw new Error("Demande non trouvée");
    if (request.status !== "PENDING") throw new Error("Cette demande a déjà été traitée");
    request.status = "REFUSED";
    request.adminNotes = adminNotes;
    request.reviewedBy = reviewedBy;
    request.reviewedAt = new Date();
    return repository.save(request);
  }

  async deleteRequest(id: number, teamId: string): Promise<boolean> {
    await this.assertEnabled(teamId);
    const repository = await this.getRequestRepository();
    const request = await repository.findOne({ where: { id, teamId } });
    if (!request) throw new Error("Demande non trouvée");
    await repository.remove(request);
    return true;
  }

  async findAllSponsors(teamId: string): Promise<Sponsor[]> {
    await this.assertEnabled(teamId);
    const repository = await this.getSponsorRepository();
    return repository.find({ where: { teamId }, order: { createdAt: "DESC" } });
  }

  async findSponsorById(id: number, teamId: string): Promise<Sponsor | null> {
    await this.assertEnabled(teamId);
    const repository = await this.getSponsorRepository();
    return repository.findOne({ where: { id, teamId } });
  }

  async updateSponsor(id: number, teamId: string, data: UpdateSponsorData): Promise<Sponsor> {
    await this.assertEnabled(teamId);
    const repository = await this.getSponsorRepository();
    const sponsor = await repository.findOne({ where: { id, teamId } });
    if (!sponsor) throw new Error("Sponsor non trouvé");

    if (data.companyName !== undefined) sponsor.companyName = data.companyName;
    if (data.logoUrl !== undefined) sponsor.logoUrl = data.logoUrl;
    if (data.logoSize !== undefined) sponsor.logoSize = data.logoSize;
    if (data.website !== undefined) sponsor.website = data.website;
    if (data.level !== undefined) sponsor.level = data.level;
    if (data.logoPlacement !== undefined) sponsor.logoPlacement = data.logoPlacement.join(",");
    if (data.contractStart !== undefined) sponsor.contractStart = data.contractStart;
    if (data.contractEnd !== undefined) sponsor.contractEnd = data.contractEnd;
    if (data.contractAmount !== undefined) sponsor.contractAmount = data.contractAmount !== null ? String(data.contractAmount) : null;
    if (data.isActive !== undefined) sponsor.isActive = data.isActive;
    return repository.save(sponsor);
  }

  async deleteSponsor(id: number, teamId: string): Promise<boolean> {
    await this.assertEnabled(teamId);
    const repository = await this.getSponsorRepository();
    const sponsor = await repository.findOne({ where: { id, teamId } });
    if (!sponsor) throw new Error("Sponsor non trouvé");
    await repository.remove(sponsor);
    return true;
  }
}
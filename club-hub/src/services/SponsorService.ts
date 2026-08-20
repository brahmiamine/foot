import { getDataSource } from "@/lib/database";
import {
  SponsorRequest,
  type SponsorLevel,
  type SponsorLogoSize,
  type SponsorRequestStatus,
} from "@/entities/SponsorRequest";
import { Sponsor } from "@/entities/Sponsor";
import type { Repository } from "typeorm";
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

/**
 * Lecture des demandes/dossiers sponsor + soumission publique.
 *
 * Les mutations contractuelles ne vivent volontairement PAS ici : elles
 * doivent passer par SponsorshipWorkflowService afin de respecter le workflow,
 * le maker/checker et le ledger CLUB-008.
 */
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
    return repository.save(repository.create({ ...data, teamId, status: "PENDING" }));
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
}

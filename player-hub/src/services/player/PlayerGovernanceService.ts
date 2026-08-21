import { randomUUID } from "node:crypto";
import { IsNull } from "typeorm";
import { PlayerAvailabilityDeclaration, type PlayerAvailabilityStatus } from "@/entities/PlayerAvailabilityDeclaration";
import { PlayerConsent, type PlayerConsentType } from "@/entities/PlayerConsent";
import {
  PlayerAdministrativeRequest,
  type PlayerAdministrativeRequestType,
} from "@/entities/PlayerAdministrativeRequest";
import { PlayerContract } from "@/entities/PlayerContract";
import { PlayerRegistration } from "@/entities/PlayerRegistration";
import { MedicalEligibility } from "@/entities/MedicalEligibility";
import { isMedicallyEligible } from "../../../../packages/regulatory-shared/src/medicalEligibility";
import { PlayerPlanningService } from "./PlayerPlanningService";

export class PlayerGovernanceServiceError extends Error {}

function isValidDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(`${value}T00:00:00Z`).getTime());
}

export interface DeclareAvailabilityInput {
  status: PlayerAvailabilityStatus;
  startDate: string;
  endDate: string;
  reason?: string | null;
}

export class PlayerGovernanceService extends PlayerPlanningService {
  // --------------------------------------------------------------------
  // PLAYER-002 : disponibilité structurée déclarée par le joueur
  // --------------------------------------------------------------------

  async listMyAvailabilityDeclarations(playerId: string): Promise<PlayerAvailabilityDeclaration[]> {
    const ds = await this.ds();
    return ds.getRepository(PlayerAvailabilityDeclaration).find({
      where: { playerId },
      order: { startDate: "DESC", createdAt: "DESC" },
    });
  }

  async declareAvailability(
    teamId: string,
    playerId: string,
    userId: string,
    input: DeclareAvailabilityInput,
  ): Promise<PlayerAvailabilityDeclaration> {
    if (!isValidDate(input.startDate) || !isValidDate(input.endDate)) {
      throw new PlayerGovernanceServiceError("Dates invalides");
    }
    if (input.endDate < input.startDate) {
      throw new PlayerGovernanceServiceError("La date de fin doit suivre la date de début");
    }

    const ds = await this.ds();
    const repo = ds.getRepository(PlayerAvailabilityDeclaration);
    const existing = await repo.find({ where: { playerId } });
    const overlapping = existing.some(
      (declaration) =>
        !declaration.cancelledAt &&
        !(input.endDate < declaration.startDate || input.startDate > declaration.endDate),
    );
    if (overlapping) {
      throw new PlayerGovernanceServiceError("Cette période chevauche une déclaration existante");
    }

    const reason = input.reason?.trim().slice(0, 500) || null;
    return repo.save(
      repo.create({
        teamId,
        playerId,
        status: input.status,
        startDate: input.startDate,
        endDate: input.endDate,
        reason,
        declaredByUserId: userId,
      }),
    );
  }

  async cancelAvailabilityDeclaration(playerId: string, id: number): Promise<void> {
    const ds = await this.ds();
    const repo = ds.getRepository(PlayerAvailabilityDeclaration);
    const declaration = await repo.findOne({ where: { id, playerId, cancelledAt: IsNull() } });
    if (!declaration) throw new PlayerGovernanceServiceError("Déclaration introuvable");
    declaration.cancelledAt = new Date();
    await repo.save(declaration);
  }

  // --------------------------------------------------------------------
  // PLAYER-003 : portefeuille documentaire réglementaire (lecture seule)
  // --------------------------------------------------------------------

  async getDocumentPortfolio(playerId: string): Promise<{
    contracts: PlayerContract[];
    registrations: PlayerRegistration[];
    medicalFit: { eligible: boolean; status: string | null; expiresAt: string | null };
  }> {
    const ds = await this.ds();
    const [contracts, registrations, eligibilities] = await Promise.all([
      ds.getRepository(PlayerContract).find({ where: { playerId }, order: { startDate: "DESC" } }),
      ds.getRepository(PlayerRegistration).find({ where: { playerId }, order: { registeredAt: "DESC" } }),
      ds.getRepository(MedicalEligibility).find({ where: { playerId }, order: { createdAt: "DESC" } }),
    ]);
    const current = eligibilities[0] ?? null;
    return {
      contracts,
      registrations,
      medicalFit: {
        eligible: current ? isMedicallyEligible(current.status, current.expiresAt) : false,
        status: current?.status ?? null,
        expiresAt: current?.expiresAt ?? null,
      },
    };
  }

  // --------------------------------------------------------------------
  // PLAYER-004 : consentements/signatures joueur
  // --------------------------------------------------------------------

  async listMyConsents(playerId: string): Promise<PlayerConsent[]> {
    const ds = await this.ds();
    return ds.getRepository(PlayerConsent).find({ where: { playerId }, order: { signedAt: "DESC" } });
  }

  async signConsent(
    teamId: string,
    playerId: string,
    userId: string,
    consentType: PlayerConsentType,
    referenceId?: string | null,
  ): Promise<PlayerConsent> {
    const ds = await this.ds();
    const repo = ds.getRepository(PlayerConsent);
    return repo.save(
      repo.create({
        id: randomUUID(),
        teamId,
        playerId,
        consentType,
        referenceId: referenceId?.trim() || null,
        signedAt: new Date(),
        signedByUserId: userId,
      }),
    );
  }

  // --------------------------------------------------------------------
  // PLAYER-005 (P2) : demandes administratives joueur avec suivi
  // --------------------------------------------------------------------

  async listMyAdministrativeRequests(playerId: string): Promise<PlayerAdministrativeRequest[]> {
    const ds = await this.ds();
    return ds.getRepository(PlayerAdministrativeRequest).find({ where: { playerId }, order: { createdAt: "DESC" } });
  }

  async submitAdministrativeRequest(
    teamId: string,
    playerId: string,
    userId: string,
    requestType: PlayerAdministrativeRequestType,
    details: string,
  ): Promise<PlayerAdministrativeRequest> {
    const trimmed = details.trim();
    if (trimmed.length < 3) throw new PlayerGovernanceServiceError("Merci de préciser votre demande");

    const ds = await this.ds();
    const repo = ds.getRepository(PlayerAdministrativeRequest);
    return repo.save(
      repo.create({
        id: randomUUID(),
        teamId,
        playerId,
        requesterUserId: userId,
        requestType,
        details: trimmed.slice(0, 2000),
        status: "NEW",
      }),
    );
  }
}

import { createHash } from "node:crypto";
import { getDataSource } from "@/lib/database";
import { Sponsor, type SponsorWorkflowStatus } from "@/entities/Sponsor";
import { SponsorRequest, type SponsorRequestStatus, type SponsorLevel, type SponsorLogoSize } from "@/entities/SponsorRequest";
import {
  SponsorContractApproval,
  SponsorContractDecision,
  SponsorshipGovernanceSettings,
  SponsorWorkflowEvent,
  type SponsorContractApprovalMode,
} from "@/entities/SponsorshipGovernance";
import { ClubFeatureSettingsService } from "./ClubFeatureSettingsService";
import { registerApproval, type ApprovalPolicy, type ApprovalState } from "../../../packages/domain-contracts/src/approval";

export interface SponsorContractDraftInput {
  level: SponsorLevel;
  logoSize: SponsorLogoSize;
  logoPlacement: string[];
  contractStart: string;
  contractEnd: string;
  contractAmount: number;
  notes?: string | null;
}

function stableHash(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function requiredApprovals(mode: SponsorContractApprovalMode): number {
  return mode === "DUAL_APPROVAL" ? 2 : 1;
}

export function sponsorApprovalModeForAmount(amount: number, threshold: number): SponsorContractApprovalMode {
  if (!Number.isFinite(amount) || amount < 0) throw new Error("Montant du contrat invalide");
  if (!Number.isFinite(threshold) || threshold < 0) throw new Error("Seuil de double approbation invalide");
  return amount >= threshold ? "DUAL_APPROVAL" : "SINGLE_APPROVAL";
}

export function validateSponsorContractWindow(start: string, end: string): void {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end)) {
    throw new Error("Dates du contrat invalides");
  }
  const startTime = Date.parse(`${start}T00:00:00.000Z`);
  const endTime = Date.parse(`${end}T00:00:00.000Z`);
  if (!Number.isFinite(startTime) || !Number.isFinite(endTime) || endTime <= startTime) {
    throw new Error("La fin du contrat doit être postérieure au début");
  }
}

function contractFingerprint(sponsor: Sponsor): string {
  return stableHash({
    companyName: sponsor.companyName,
    level: sponsor.level,
    logoSize: sponsor.logoSize,
    logoPlacement: sponsor.logoPlacement ?? null,
    contractStart: sponsor.contractStart ?? null,
    contractEnd: sponsor.contractEnd ?? null,
    contractAmount: sponsor.contractAmount ?? null,
  });
}

function eventDetails(value: Record<string, unknown>): string | null {
  return Object.keys(value).length > 0 ? JSON.stringify(value) : null;
}

export class SponsorshipWorkflowService {
  private async assertEnabled(teamId: string): Promise<void> {
    await new ClubFeatureSettingsService().assertEnabled(teamId, "SPONSORING");
  }

  async getGovernanceSettings(teamId: string): Promise<{ dualApprovalThreshold: number; version: number }> {
    await this.assertEnabled(teamId);
    const ds = await getDataSource();
    const row = await ds.getRepository(SponsorshipGovernanceSettings).findOne({ where: { teamId } });
    return {
      dualApprovalThreshold: row ? Number(row.dualApprovalThreshold) : 0,
      version: row?.version ?? 0,
    };
  }

  async updateGovernanceSettings(
    teamId: string,
    actorUserId: string,
    dualApprovalThreshold: number,
  ): Promise<{ dualApprovalThreshold: number; version: number }> {
    await this.assertEnabled(teamId);
    if (!Number.isFinite(dualApprovalThreshold) || dualApprovalThreshold < 0) {
      throw new Error("Seuil de double approbation invalide");
    }
    const ds = await getDataSource();
    await ds.transaction(async (manager) => {
      const repo = manager.getRepository(SponsorshipGovernanceSettings);
      const current = await repo.findOne({ where: { teamId }, lock: { mode: "pessimistic_write" } });
      const row = current ?? repo.create({ teamId, version: 1 });
      row.dualApprovalThreshold = dualApprovalThreshold.toFixed(3);
      row.version = current ? current.version + 1 : 1;
      row.updatedBy = actorUserId;
      await repo.save(row);
      await this.recordEvent(manager, {
        teamId,
        actorUserId,
        transition: "SET_APPROVAL_THRESHOLD",
        toStatus: "CONFIGURED",
        details: { dualApprovalThreshold: row.dualApprovalThreshold, version: row.version },
      });
    });
    return this.getGovernanceSettings(teamId);
  }

  async reviewRequest(id: number, teamId: string, actorUserId: string, notes?: string | null): Promise<SponsorRequest> {
    return this.transitionRequest(
      id,
      teamId,
      actorUserId,
      ["PENDING"],
      "UNDER_REVIEW",
      "REVIEW_REQUEST",
      (request) => {
        request.adminNotes = notes?.trim() || null;
        request.reviewedAt = new Date();
        request.reviewedBy = actorUserId;
        return { notes: request.adminNotes };
      },
    );
  }

  async startNegotiation(id: number, teamId: string, actorUserId: string, notes?: string | null): Promise<SponsorRequest> {
    return this.transitionRequest(
      id,
      teamId,
      actorUserId,
      ["UNDER_REVIEW"],
      "NEGOTIATION",
      "START_NEGOTIATION",
      (request) => {
        request.negotiationNotes = notes?.trim() || null;
        request.negotiationStartedAt = new Date();
        request.negotiationStartedBy = actorUserId;
        return { notes: request.negotiationNotes };
      },
    );
  }

  async draftContract(
    requestId: number,
    teamId: string,
    actorUserId: string,
    input: SponsorContractDraftInput,
  ): Promise<Sponsor> {
    await this.assertEnabled(teamId);
    validateSponsorContractWindow(input.contractStart, input.contractEnd);
    if (!Number.isFinite(input.contractAmount) || input.contractAmount < 0) throw new Error("Montant du contrat invalide");

    const ds = await getDataSource();
    return ds.transaction(async (manager) => {
      const requestRepo = manager.getRepository(SponsorRequest);
      const sponsorRepo = manager.getRepository(Sponsor);
      const request = await requestRepo.findOne({
        where: { id: requestId, teamId },
        lock: { mode: "pessimistic_write" },
      });
      if (!request) throw new Error("Demande sponsor introuvable");
      if (request.status !== "NEGOTIATION") {
        throw new Error(`Transition sponsoring invalide depuis ${request.status}`);
      }
      const existing = await sponsorRepo.findOne({ where: { teamId, sponsorRequestId: request.id } });
      if (existing) throw new Error("Un dossier sponsor existe déjà pour cette demande");

      const sponsor = sponsorRepo.create({
        teamId,
        sponsorRequestId: request.id,
        companyName: request.companyName,
        logoUrl: request.logoUrl ?? null,
        logoSize: input.logoSize,
        website: request.website ?? null,
        level: input.level,
        logoPlacement: input.logoPlacement.join(","),
        contractStart: input.contractStart,
        contractEnd: input.contractEnd,
        contractAmount: input.contractAmount.toFixed(3),
        workflowStatus: "CONTRACT_DRAFT",
        contractDraftedBy: actorUserId,
        contractDraftedAt: new Date(),
        isActive: false,
      });
      const saved = await sponsorRepo.save(sponsor);
      const fromStatus = request.status;
      request.status = "CONTRACT_DRAFT";
      if (input.notes !== undefined) request.adminNotes = input.notes?.trim() || null;
      await requestRepo.save(request);
      await this.recordEvent(manager, {
        teamId,
        sponsorRequestId: request.id,
        sponsorId: saved.id,
        actorUserId,
        transition: "DRAFT_CONTRACT",
        fromStatus,
        toStatus: "CONTRACT_DRAFT",
        details: {
          amount: saved.contractAmount,
          contractStart: saved.contractStart,
          contractEnd: saved.contractEnd,
          level: saved.level,
        },
      });
      return saved;
    });
  }

  async updateDraftContract(
    sponsorId: number,
    teamId: string,
    actorUserId: string,
    input: SponsorContractDraftInput,
  ): Promise<Sponsor> {
    await this.assertEnabled(teamId);
    validateSponsorContractWindow(input.contractStart, input.contractEnd);
    if (!Number.isFinite(input.contractAmount) || input.contractAmount < 0) throw new Error("Montant du contrat invalide");
    const ds = await getDataSource();
    return ds.transaction(async (manager) => {
      const repo = manager.getRepository(Sponsor);
      const sponsor = await repo.findOne({ where: { id: sponsorId, teamId }, lock: { mode: "pessimistic_write" } });
      if (!sponsor) throw new Error("Sponsor non trouvé");
      if (sponsor.workflowStatus !== "CONTRACT_DRAFT") {
        throw new Error("Le contrat doit revenir en brouillon avant modification");
      }
      sponsor.level = input.level;
      sponsor.logoSize = input.logoSize;
      sponsor.logoPlacement = input.logoPlacement.join(",");
      sponsor.contractStart = input.contractStart;
      sponsor.contractEnd = input.contractEnd;
      sponsor.contractAmount = input.contractAmount.toFixed(3);
      sponsor.contractDraftedBy = actorUserId;
      sponsor.contractDraftedAt = new Date();
      const saved = await repo.save(sponsor);
      await this.recordEvent(manager, {
        teamId,
        sponsorRequestId: sponsor.sponsorRequestId ?? null,
        sponsorId: sponsor.id,
        actorUserId,
        transition: "UPDATE_CONTRACT_DRAFT",
        fromStatus: "CONTRACT_DRAFT",
        toStatus: "CONTRACT_DRAFT",
        details: { fingerprint: contractFingerprint(saved) },
      });
      return saved;
    });
  }

  async submitForApproval(sponsorId: number, teamId: string, makerUserId: string): Promise<SponsorContractApproval> {
    await this.assertEnabled(teamId);
    const ds = await getDataSource();
    return ds.transaction(async (manager) => {
      const sponsorRepo = manager.getRepository(Sponsor);
      const requestRepo = manager.getRepository(SponsorRequest);
      const approvalRepo = manager.getRepository(SponsorContractApproval);
      const settingsRepo = manager.getRepository(SponsorshipGovernanceSettings);
      const sponsor = await sponsorRepo.findOne({
        where: { id: sponsorId, teamId },
        lock: { mode: "pessimistic_write" },
      });
      if (!sponsor) throw new Error("Sponsor non trouvé");
      if (sponsor.workflowStatus !== "CONTRACT_DRAFT") {
        throw new Error(`Contrat non soumissible depuis ${sponsor.workflowStatus}`);
      }
      if (sponsor.contractAmount === null || sponsor.contractAmount === undefined) throw new Error("Montant du contrat obligatoire");
      if (!sponsor.contractStart || !sponsor.contractEnd) throw new Error("Dates du contrat obligatoires");
      validateSponsorContractWindow(sponsor.contractStart, sponsor.contractEnd);

      const settings = await settingsRepo.findOne({ where: { teamId } });
      const threshold = settings ? Number(settings.dualApprovalThreshold) : 0;
      const amount = Number(sponsor.contractAmount);
      const mode = sponsorApprovalModeForAmount(amount, threshold);
      const fingerprint = contractFingerprint(sponsor);

      const active = await approvalRepo.find({ where: { teamId, sponsorId, status: "PENDING" } });
      for (const approval of active) {
        approval.status = "CANCELLED";
        approval.resolvedAt = new Date();
        await approvalRepo.save(approval);
      }

      const approval = await approvalRepo.save(
        approvalRepo.create({
          teamId,
          sponsorId,
          makerUserId,
          approvalMode: mode,
          requiredApprovals: requiredApprovals(mode),
          contractAmountSnapshot: amount.toFixed(3),
          thresholdSnapshot: threshold.toFixed(3),
          contractFingerprint: fingerprint,
          status: "PENDING",
          rejectionReason: null,
          resolvedAt: null,
        }),
      );
      sponsor.workflowStatus = "APPROVAL_PENDING";
      sponsor.isActive = false;
      await sponsorRepo.save(sponsor);
      if (sponsor.sponsorRequestId) {
        const request = await requestRepo.findOne({ where: { id: sponsor.sponsorRequestId, teamId } });
        if (request) {
          request.status = "APPROVAL_PENDING";
          await requestRepo.save(request);
        }
      }
      await this.recordEvent(manager, {
        teamId,
        sponsorRequestId: sponsor.sponsorRequestId ?? null,
        sponsorId,
        actorUserId: makerUserId,
        transition: "SUBMIT_CONTRACT_APPROVAL",
        fromStatus: "CONTRACT_DRAFT",
        toStatus: "APPROVAL_PENDING",
        details: { approvalId: approval.id, mode, threshold: approval.thresholdSnapshot, amount: approval.contractAmountSnapshot },
      });
      return approval;
    });
  }

  async approveContract(approvalId: string, teamId: string, actorUserId: string): Promise<SponsorContractApproval> {
    await this.assertEnabled(teamId);
    const ds = await getDataSource();
    return ds.transaction(async (manager) => {
      const approvalRepo = manager.getRepository(SponsorContractApproval);
      const decisionRepo = manager.getRepository(SponsorContractDecision);
      const sponsorRepo = manager.getRepository(Sponsor);
      const requestRepo = manager.getRepository(SponsorRequest);
      const approval = await approvalRepo
        .createQueryBuilder("approval")
        .setLock("pessimistic_write")
        .where("approval.id = :approvalId AND approval.teamId = :teamId", { approvalId, teamId })
        .getOne();
      if (!approval || approval.status !== "PENDING") throw new Error("Approbation introuvable ou déjà résolue");
      const sponsor = await sponsorRepo.findOne({ where: { id: approval.sponsorId, teamId } });
      if (!sponsor || sponsor.workflowStatus !== "APPROVAL_PENDING") throw new Error("Contrat sponsor introuvable ou hors workflow");

      if (contractFingerprint(sponsor) !== approval.contractFingerprint) {
        approval.status = "CANCELLED";
        approval.resolvedAt = new Date();
        await approvalRepo.save(approval);
        sponsor.workflowStatus = "CONTRACT_DRAFT";
        await sponsorRepo.save(sponsor);
        if (sponsor.sponsorRequestId) {
          const request = await requestRepo.findOne({ where: { id: sponsor.sponsorRequestId, teamId } });
          if (request) {
            request.status = "CONTRACT_DRAFT";
            await requestRepo.save(request);
          }
        }
        throw new Error("Le contrat a changé depuis sa soumission : une nouvelle approbation est requise");
      }

      const decisions = await decisionRepo.find({ where: { approvalId: approval.id, decision: "APPROVE" } });
      const policy: ApprovalPolicy = { mode: approval.approvalMode, makerCheckerEnabled: true };
      const state: ApprovalState = {
        makerUserId: approval.makerUserId,
        approverUserIds: decisions.map((decision) => decision.actorUserId),
      };
      const registered = registerApproval(policy, state, actorUserId);
      await decisionRepo.save(
        decisionRepo.create({ approvalId: approval.id, actorUserId, decision: "APPROVE", reason: null }),
      );

      if (registered.evaluation.canFinalize) {
        approval.status = "APPROVED";
        approval.resolvedAt = new Date();
        await approvalRepo.save(approval);
        sponsor.workflowStatus = "APPROVED";
        await sponsorRepo.save(sponsor);
        if (sponsor.sponsorRequestId) {
          const request = await requestRepo.findOne({ where: { id: sponsor.sponsorRequestId, teamId } });
          if (request) {
            request.status = "APPROVED";
            await requestRepo.save(request);
          }
        }
      }

      await this.recordEvent(manager, {
        teamId,
        sponsorRequestId: sponsor.sponsorRequestId ?? null,
        sponsorId: sponsor.id,
        actorUserId,
        transition: registered.evaluation.canFinalize ? "APPROVE_CONTRACT_FINAL" : "APPROVE_CONTRACT",
        fromStatus: "APPROVAL_PENDING",
        toStatus: registered.evaluation.canFinalize ? "APPROVED" : "APPROVAL_PENDING",
        details: { approvalId: approval.id, approvals: registered.nextState.approverUserIds.length },
      });
      return approval;
    });
  }

  async rejectContract(approvalId: string, teamId: string, actorUserId: string, reason: string): Promise<SponsorContractApproval> {
    await this.assertEnabled(teamId);
    const normalizedReason = reason.trim();
    if (normalizedReason.length < 3) throw new Error("Motif de rejet obligatoire");
    const ds = await getDataSource();
    return ds.transaction(async (manager) => {
      const approvalRepo = manager.getRepository(SponsorContractApproval);
      const decisionRepo = manager.getRepository(SponsorContractDecision);
      const sponsorRepo = manager.getRepository(Sponsor);
      const requestRepo = manager.getRepository(SponsorRequest);
      const approval = await approvalRepo
        .createQueryBuilder("approval")
        .setLock("pessimistic_write")
        .where("approval.id = :approvalId AND approval.teamId = :teamId", { approvalId, teamId })
        .getOne();
      if (!approval || approval.status !== "PENDING") throw new Error("Approbation introuvable ou déjà résolue");
      if (approval.makerUserId === actorUserId) throw new Error("Le créateur du contrat ne peut pas rejeter sa propre soumission");
      const sponsor = await sponsorRepo.findOne({ where: { id: approval.sponsorId, teamId } });
      if (!sponsor) throw new Error("Sponsor non trouvé");
      await decisionRepo.save(
        decisionRepo.create({ approvalId: approval.id, actorUserId, decision: "REJECT", reason: normalizedReason }),
      );
      approval.status = "REJECTED";
      approval.rejectionReason = normalizedReason;
      approval.resolvedAt = new Date();
      await approvalRepo.save(approval);
      sponsor.workflowStatus = "CONTRACT_DRAFT";
      sponsor.isActive = false;
      await sponsorRepo.save(sponsor);
      if (sponsor.sponsorRequestId) {
        const request = await requestRepo.findOne({ where: { id: sponsor.sponsorRequestId, teamId } });
        if (request) {
          request.status = "CONTRACT_DRAFT";
          await requestRepo.save(request);
        }
      }
      await this.recordEvent(manager, {
        teamId,
        sponsorRequestId: sponsor.sponsorRequestId ?? null,
        sponsorId: sponsor.id,
        actorUserId,
        transition: "REJECT_CONTRACT",
        fromStatus: "APPROVAL_PENDING",
        toStatus: "CONTRACT_DRAFT",
        details: { approvalId, reason: normalizedReason },
      });
      return approval;
    });
  }

  async activateSponsor(sponsorId: number, teamId: string, actorUserId: string, now: Date = new Date()): Promise<Sponsor> {
    await this.assertEnabled(teamId);
    const today = now.toISOString().slice(0, 10);
    const ds = await getDataSource();
    return ds.transaction(async (manager) => {
      const sponsorRepo = manager.getRepository(Sponsor);
      const requestRepo = manager.getRepository(SponsorRequest);
      const sponsor = await sponsorRepo.findOne({ where: { id: sponsorId, teamId }, lock: { mode: "pessimistic_write" } });
      if (!sponsor) throw new Error("Sponsor non trouvé");
      if (sponsor.workflowStatus !== "APPROVED") throw new Error("Le contrat doit être approuvé avant activation");
      if (!sponsor.contractStart || !sponsor.contractEnd) throw new Error("Dates du contrat obligatoires");
      if (today < sponsor.contractStart) throw new Error("Le contrat n'a pas encore commencé");
      if (today >= sponsor.contractEnd) throw new Error("Le contrat est déjà expiré");
      sponsor.workflowStatus = "ACTIVE";
      sponsor.isActive = true;
      sponsor.activatedBy = actorUserId;
      sponsor.activatedAt = now;
      const saved = await sponsorRepo.save(sponsor);
      if (sponsor.sponsorRequestId) {
        const request = await requestRepo.findOne({ where: { id: sponsor.sponsorRequestId, teamId } });
        if (request) {
          request.status = "ACTIVE";
          await requestRepo.save(request);
        }
      }
      await this.recordEvent(manager, {
        teamId,
        sponsorRequestId: sponsor.sponsorRequestId ?? null,
        sponsorId,
        actorUserId,
        transition: "ACTIVATE_SPONSOR",
        fromStatus: "APPROVED",
        toStatus: "ACTIVE",
        details: { activatedAt: now.toISOString() },
      });
      return saved;
    });
  }

  async expireDue(teamId: string, now: Date = new Date()): Promise<number> {
    await this.assertEnabled(teamId);
    const today = now.toISOString().slice(0, 10);
    const ds = await getDataSource();
    const due = await ds.getRepository(Sponsor).find({ where: { teamId, workflowStatus: "ACTIVE" } });
    let expired = 0;
    for (const candidate of due) {
      if (!candidate.contractEnd || candidate.contractEnd > today) continue;
      const changed = await ds.transaction(async (manager) => {
        const sponsorRepo = manager.getRepository(Sponsor);
        const requestRepo = manager.getRepository(SponsorRequest);
        const sponsor = await sponsorRepo.findOne({
          where: { id: candidate.id, teamId },
          lock: { mode: "pessimistic_write" },
        });
        if (!sponsor || sponsor.workflowStatus !== "ACTIVE" || !sponsor.contractEnd || sponsor.contractEnd > today) return false;
        sponsor.workflowStatus = "EXPIRED";
        sponsor.isActive = false;
        sponsor.expiredAt = now;
        await sponsorRepo.save(sponsor);
        if (sponsor.sponsorRequestId) {
          const request = await requestRepo.findOne({ where: { id: sponsor.sponsorRequestId, teamId } });
          if (request) {
            request.status = "EXPIRED";
            await requestRepo.save(request);
          }
        }
        await this.recordEvent(manager, {
          teamId,
          sponsorRequestId: sponsor.sponsorRequestId ?? null,
          sponsorId: sponsor.id,
          actorUserId: "SYSTEM",
          transition: "EXPIRE_SPONSOR",
          fromStatus: "ACTIVE",
          toStatus: "EXPIRED",
          details: { expiredAt: now.toISOString() },
        });
        return true;
      });
      if (changed) expired += 1;
    }
    return expired;
  }

  async refuseRequest(id: number, teamId: string, actorUserId: string, reason: string): Promise<SponsorRequest> {
    const normalizedReason = reason.trim();
    if (normalizedReason.length < 3) throw new Error("Motif de refus obligatoire");
    return this.transitionRequest(
      id,
      teamId,
      actorUserId,
      ["PENDING", "UNDER_REVIEW", "NEGOTIATION"],
      "REFUSED",
      "REFUSE_REQUEST",
      (request) => {
        request.refusedBy = actorUserId;
        request.refusedAt = new Date();
        request.refusalReason = normalizedReason;
        return { reason: normalizedReason };
      },
    );
  }

  async deletePendingRequest(id: number, teamId: string): Promise<boolean> {
    await this.assertEnabled(teamId);
    const ds = await getDataSource();
    const repo = ds.getRepository(SponsorRequest);
    const request = await repo.findOne({ where: { id, teamId } });
    if (!request) throw new Error("Demande sponsor introuvable");
    if (request.status !== "PENDING") throw new Error("Une demande déjà traitée ne peut pas être supprimée");
    await repo.remove(request);
    return true;
  }

  private async transitionRequest(
    id: number,
    teamId: string,
    actorUserId: string,
    expected: SponsorRequestStatus[],
    nextStatus: SponsorRequestStatus,
    transition: string,
    patch: (request: SponsorRequest) => Record<string, unknown> | void,
  ): Promise<SponsorRequest> {
    await this.assertEnabled(teamId);
    const ds = await getDataSource();
    return ds.transaction(async (manager) => {
      const repo = manager.getRepository(SponsorRequest);
      const request = await repo.findOne({ where: { id, teamId }, lock: { mode: "pessimistic_write" } });
      if (!request) throw new Error("Demande sponsor introuvable");
      if (!expected.includes(request.status)) throw new Error(`Transition sponsoring invalide depuis ${request.status}`);
      const fromStatus = request.status;
      const details = patch(request) ?? {};
      request.status = nextStatus;
      const saved = await repo.save(request);
      await this.recordEvent(manager, {
        teamId,
        sponsorRequestId: request.id,
        actorUserId,
        transition,
        fromStatus,
        toStatus: nextStatus,
        details,
      });
      return saved;
    });
  }

  private async recordEvent(
    manager: { getRepository: (entity: typeof SponsorWorkflowEvent) => ReturnType<Awaited<ReturnType<typeof getDataSource>>["getRepository"]> },
    input: {
      teamId: string;
      sponsorRequestId?: number | null;
      sponsorId?: number | null;
      actorUserId: string;
      transition: string;
      fromStatus?: SponsorRequestStatus | SponsorWorkflowStatus | null;
      toStatus: string;
      details?: Record<string, unknown>;
    },
  ): Promise<void> {
    const repo = manager.getRepository(SponsorWorkflowEvent);
    await repo.save(
      repo.create({
        teamId: input.teamId,
        sponsorRequestId: input.sponsorRequestId ?? null,
        sponsorId: input.sponsorId ?? null,
        actorUserId: input.actorUserId,
        transition: input.transition,
        fromStatus: input.fromStatus ?? null,
        toStatus: input.toStatus,
        details: eventDetails(input.details ?? {}),
      }),
    );
  }
}

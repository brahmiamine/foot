import { createHash } from "node:crypto";
import type { EntityManager } from "typeorm";
import { getDataSource } from "@/lib/database";
import { Trip, type TripWorkflowStatus } from "@/entities/Trip";
import { TripParticipant } from "@/entities/TripParticipant";
import {
  TripBudgetApproval,
  TripBudgetDecision,
  TripExpenseReceipt,
  TripGovernanceSettings,
  TripWorkflowEvent,
  type TripBudgetApprovalMode,
} from "@/entities/TripGovernance";
import {
  registerApproval,
  type ApprovalPolicy,
  type ApprovalState,
} from "../../../packages/domain-contracts/src/approval";

export interface TripGovernanceSettingsValue {
  dualApprovalThreshold: number;
  receiptRequiredThreshold: number;
  version: number;
}

export interface TripExpenseInput {
  label: string;
  amount: number;
  documentUrl?: string | null;
}

type DateLike = Date | string | null | undefined;

function stableHash(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function requiredApprovals(mode: TripBudgetApprovalMode): number {
  return mode === "DUAL_APPROVAL" ? 2 : 1;
}

function eventDetails(value: Record<string, unknown>): string | null {
  return Object.keys(value).length > 0 ? JSON.stringify(value) : null;
}

function asValidDate(value: DateLike): Date | null {
  if (!value) return null;
  const normalized = value instanceof Date ? value : new Date(value);
  return Number.isNaN(normalized.getTime()) ? null : normalized;
}

function normalizeDate(value: Date | string): string {
  const normalized = asValidDate(value);
  if (!normalized) throw new Error("Date du déplacement invalide");
  return normalized.toISOString();
}

function tripFingerprint(trip: Trip): string {
  return stableHash({
    id: trip.id,
    teamId: trip.teamId,
    category: trip.category,
    matchType: trip.matchType ?? null,
    matchId: trip.matchId ?? null,
    friendlyMatchId: trip.friendlyMatchId ?? null,
    departureTime: normalizeDate(trip.departureTime),
    meetingPoint: trip.meetingPoint ?? null,
    estimatedBudget: trip.estimatedBudget ?? null,
  });
}

export function validateTripBudget(amount: number): void {
  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error("Budget du déplacement invalide");
  }
}

export function tripApprovalModeForBudget(amount: number, threshold: number): TripBudgetApprovalMode {
  validateTripBudget(amount);
  if (!Number.isFinite(threshold) || threshold < 0) {
    throw new Error("Seuil de double approbation invalide");
  }
  return amount >= threshold ? "DUAL_APPROVAL" : "SINGLE_APPROVAL";
}

export function requiresTripReceipt(amount: number, threshold: number): boolean {
  validateTripBudget(amount);
  if (!Number.isFinite(threshold) || threshold < 0) {
    throw new Error("Seuil de justificatif invalide");
  }
  return amount > 0 && amount >= threshold;
}

export function playerRequiresTripConsent(birthDate: DateLike, departure: Date | string): boolean {
  const normalizedBirthDate = asValidDate(birthDate);
  const normalizedDeparture = asValidDate(departure);
  if (!normalizedBirthDate || !normalizedDeparture) return true;

  let age = normalizedDeparture.getUTCFullYear() - normalizedBirthDate.getUTCFullYear();
  const departureMonth = normalizedDeparture.getUTCMonth();
  const birthMonth = normalizedBirthDate.getUTCMonth();
  if (
    departureMonth < birthMonth ||
    (departureMonth === birthMonth && normalizedDeparture.getUTCDate() < normalizedBirthDate.getUTCDate())
  ) {
    age -= 1;
  }
  return age < 18;
}

export function isSafeTripEvidenceLocation(value: string): boolean {
  return /^https?:\/\//i.test(value) || /^\/uploads\/trips\/[A-Za-z0-9._-]+$/.test(value);
}

export class TripWorkflowService {
  async getGovernanceSettings(teamId: string): Promise<TripGovernanceSettingsValue> {
    const ds = await getDataSource();
    const row = await ds.getRepository(TripGovernanceSettings).findOne({ where: { teamId } });
    return this.settingsValue(row);
  }

  async updateGovernanceSettings(
    teamId: string,
    actorUserId: string,
    input: { dualApprovalThreshold: number; receiptRequiredThreshold: number },
  ): Promise<TripGovernanceSettingsValue> {
    validateTripBudget(input.dualApprovalThreshold);
    validateTripBudget(input.receiptRequiredThreshold);
    const ds = await getDataSource();
    await ds.transaction(async (manager) => {
      const repo = manager.getRepository(TripGovernanceSettings);
      const current = await repo.findOne({ where: { teamId }, lock: { mode: "pessimistic_write" } });
      const row = current ?? repo.create({ teamId, version: 1 });
      row.dualApprovalThreshold = input.dualApprovalThreshold.toFixed(3);
      row.receiptRequiredThreshold = input.receiptRequiredThreshold.toFixed(3);
      row.version = current ? current.version + 1 : 1;
      row.updatedBy = actorUserId;
      await repo.save(row);
    });
    return this.getGovernanceSettings(teamId);
  }

  async submitBudget(
    tripId: number,
    teamId: string,
    makerUserId: string,
    estimatedBudget: number,
  ): Promise<TripBudgetApproval> {
    validateTripBudget(estimatedBudget);
    const ds = await getDataSource();
    return ds.transaction(async (manager) => {
      const tripRepo = manager.getRepository(Trip);
      const approvalRepo = manager.getRepository(TripBudgetApproval);
      const trip = await tripRepo.findOne({ where: { id: tripId, teamId }, lock: { mode: "pessimistic_write" } });
      if (!trip) throw new Error("Déplacement non trouvé");
      if (trip.workflowStatus !== "DRAFT") {
        throw new Error(`Budget non soumissible depuis ${trip.workflowStatus}`);
      }

      const settings = await this.getSettingsForManager(manager, teamId);
      const mode = tripApprovalModeForBudget(estimatedBudget, settings.dualApprovalThreshold);
      trip.estimatedBudget = estimatedBudget.toFixed(3);
      const fingerprint = tripFingerprint(trip);

      const pending = await approvalRepo.find({ where: { teamId, tripId, status: "PENDING" } });
      for (const approval of pending) {
        approval.status = "CANCELLED";
        approval.resolvedAt = new Date();
        await approvalRepo.save(approval);
      }

      const approval = await approvalRepo.save(
        approvalRepo.create({
          teamId,
          tripId,
          makerUserId,
          approvalMode: mode,
          requiredApprovals: requiredApprovals(mode),
          estimatedBudgetSnapshot: estimatedBudget.toFixed(3),
          thresholdSnapshot: settings.dualApprovalThreshold.toFixed(3),
          tripFingerprint: fingerprint,
          status: "PENDING",
          rejectionReason: null,
          resolvedAt: null,
        }),
      );

      await this.initializeParticipantConsents(manager, trip);
      trip.workflowStatus = "APPROVAL_PENDING";
      trip.approvedBudget = null;
      trip.actualBudget = null;
      trip.budgetSubmittedBy = makerUserId;
      trip.budgetSubmittedAt = new Date();
      trip.budgetApprovedAt = null;
      await tripRepo.save(trip);
      await this.recordEvent(manager, {
        teamId,
        tripId,
        actorUserId: makerUserId,
        transition: "SUBMIT_BUDGET",
        fromStatus: "DRAFT",
        toStatus: "APPROVAL_PENDING",
        details: {
          approvalId: approval.id,
          amount: approval.estimatedBudgetSnapshot,
          mode,
          threshold: approval.thresholdSnapshot,
        },
      });
      return approval;
    });
  }

  async approveBudget(approvalId: string, teamId: string, actorUserId: string): Promise<TripBudgetApproval> {
    const ds = await getDataSource();
    const outcome = await ds.transaction(async (manager) => {
      const approvalRepo = manager.getRepository(TripBudgetApproval);
      const decisionRepo = manager.getRepository(TripBudgetDecision);
      const tripRepo = manager.getRepository(Trip);
      const approval = await approvalRepo
        .createQueryBuilder("approval")
        .setLock("pessimistic_write")
        .where("approval.id = :approvalId AND approval.teamId = :teamId", { approvalId, teamId })
        .getOne();
      if (!approval || approval.status !== "PENDING") {
        throw new Error("Approbation déplacement introuvable ou déjà résolue");
      }

      const trip = await tripRepo.findOne({
        where: { id: approval.tripId, teamId },
        lock: { mode: "pessimistic_write" },
      });
      if (!trip || trip.workflowStatus !== "APPROVAL_PENDING") {
        throw new Error("Déplacement hors workflow d'approbation");
      }

      if (tripFingerprint(trip) !== approval.tripFingerprint) {
        approval.status = "CANCELLED";
        approval.resolvedAt = new Date();
        await approvalRepo.save(approval);
        const fromStatus = trip.workflowStatus;
        trip.workflowStatus = "DRAFT";
        trip.approvedBudget = null;
        await tripRepo.save(trip);
        await this.recordEvent(manager, {
          teamId,
          tripId: trip.id,
          actorUserId,
          transition: "CANCEL_STALE_BUDGET_APPROVAL",
          fromStatus,
          toStatus: "DRAFT",
          details: { approvalId: approval.id },
        });
        return { approval, stale: true };
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
        trip.workflowStatus = "APPROVED";
        trip.approvedBudget = approval.estimatedBudgetSnapshot;
        trip.budgetApprovedAt = new Date();
        await tripRepo.save(trip);
      }

      await this.recordEvent(manager, {
        teamId,
        tripId: trip.id,
        actorUserId,
        transition: registered.evaluation.canFinalize ? "APPROVE_BUDGET_FINAL" : "APPROVE_BUDGET",
        fromStatus: "APPROVAL_PENDING",
        toStatus: registered.evaluation.canFinalize ? "APPROVED" : "APPROVAL_PENDING",
        details: {
          approvalId: approval.id,
          approvals: registered.state.approverUserIds.length,
          requiredApprovals: approval.requiredApprovals,
        },
      });
      return { approval, stale: false };
    });

    if (outcome.stale) {
      throw new Error("Le déplacement a changé depuis sa soumission : une nouvelle approbation est requise");
    }
    return outcome.approval;
  }

  async rejectBudget(
    approvalId: string,
    teamId: string,
    actorUserId: string,
    reason: string,
  ): Promise<TripBudgetApproval> {
    const normalizedReason = reason.trim();
    if (normalizedReason.length < 3) throw new Error("Motif de rejet obligatoire");
    const ds = await getDataSource();
    return ds.transaction(async (manager) => {
      const approvalRepo = manager.getRepository(TripBudgetApproval);
      const decisionRepo = manager.getRepository(TripBudgetDecision);
      const tripRepo = manager.getRepository(Trip);
      const approval = await approvalRepo
        .createQueryBuilder("approval")
        .setLock("pessimistic_write")
        .where("approval.id = :approvalId AND approval.teamId = :teamId", { approvalId, teamId })
        .getOne();
      if (!approval || approval.status !== "PENDING") {
        throw new Error("Approbation déplacement introuvable ou déjà résolue");
      }
      if (approval.makerUserId === actorUserId) {
        throw new Error("Le créateur du budget ne peut pas rejeter sa propre soumission");
      }
      const trip = await tripRepo.findOne({
        where: { id: approval.tripId, teamId },
        lock: { mode: "pessimistic_write" },
      });
      if (!trip || trip.workflowStatus !== "APPROVAL_PENDING") throw new Error("Déplacement hors workflow");

      await decisionRepo.save(
        decisionRepo.create({ approvalId: approval.id, actorUserId, decision: "REJECT", reason: normalizedReason }),
      );
      approval.status = "REJECTED";
      approval.rejectionReason = normalizedReason;
      approval.resolvedAt = new Date();
      await approvalRepo.save(approval);
      trip.workflowStatus = "DRAFT";
      trip.approvedBudget = null;
      trip.budgetApprovedAt = null;
      await tripRepo.save(trip);
      await this.recordEvent(manager, {
        teamId,
        tripId: trip.id,
        actorUserId,
        transition: "REJECT_BUDGET",
        fromStatus: "APPROVAL_PENDING",
        toStatus: "DRAFT",
        details: { approvalId: approval.id, reason: normalizedReason },
      });
      return approval;
    });
  }

  async recordConsent(
    participantId: number,
    teamId: string,
    actorUserId: string,
    granted: boolean,
    note?: string | null,
  ): Promise<TripParticipant> {
    const ds = await getDataSource();
    return ds.transaction(async (manager) => {
      const participantRepo = manager.getRepository(TripParticipant);
      const preliminary = await participantRepo.findOne({ where: { id: participantId } });
      if (!preliminary) throw new Error("Participant non trouvé");
      const trip = await manager.getRepository(Trip).findOne({
        where: { id: preliminary.tripId, teamId },
        lock: { mode: "pessimistic_write" },
      });
      if (!trip) throw new Error("Participant non trouvé pour ce club");
      if (trip.workflowStatus !== "APPROVED") {
        throw new Error("Les consentements sont enregistrables après approbation du budget et avant READY");
      }
      const participant = await participantRepo.findOne({
        where: { id: participantId, tripId: trip.id },
        relations: ["player"],
      });
      if (!participant) throw new Error("Participant non trouvé");
      const required =
        participant.participantType === "PLAYER" &&
        playerRequiresTripConsent(participant.player?.birthDate ?? null, trip.departureTime);
      if (!required) throw new Error("Aucun consentement n'est requis pour ce participant");

      const previous = participant.consentStatus;
      participant.consentStatus = granted ? "GRANTED" : "REFUSED";
      participant.consentRecordedBy = actorUserId;
      participant.consentRecordedAt = new Date();
      participant.consentNote = note?.trim() || null;
      const saved = await participantRepo.save(participant);
      await this.recordEvent(manager, {
        teamId,
        tripId: trip.id,
        participantId: participant.id,
        actorUserId,
        transition: granted ? "CONSENT_GRANTED" : "CONSENT_REFUSED",
        fromStatus: previous,
        toStatus: participant.consentStatus,
        details: { note: participant.consentNote },
      });
      return saved;
    });
  }

  async markReady(tripId: number, teamId: string, actorUserId: string): Promise<Trip> {
    const ds = await getDataSource();
    return ds.transaction(async (manager) => {
      const tripRepo = manager.getRepository(Trip);
      const trip = await tripRepo.findOne({ where: { id: tripId, teamId }, lock: { mode: "pessimistic_write" } });
      if (!trip) throw new Error("Déplacement non trouvé");
      if (trip.workflowStatus !== "APPROVED") throw new Error("Le budget doit être approuvé avant READY");
      if (trip.approvedBudget === null || trip.approvedBudget === undefined) {
        throw new Error("Budget approuvé manquant");
      }

      const participants = await manager.getRepository(TripParticipant).find({
        where: { tripId: trip.id },
        relations: ["player"],
      });
      const missing = participants.filter(
        (participant) =>
          participant.participantType === "PLAYER" &&
          playerRequiresTripConsent(participant.player?.birthDate ?? null, trip.departureTime) &&
          participant.consentStatus !== "GRANTED",
      );
      if (missing.length > 0) {
        throw new Error(`${missing.length} consentement(s) requis avant de déclarer le déplacement prêt`);
      }

      trip.workflowStatus = "READY";
      trip.readyBy = actorUserId;
      trip.readyAt = new Date();
      const saved = await tripRepo.save(trip);
      await this.recordEvent(manager, {
        teamId,
        tripId,
        actorUserId,
        transition: "MARK_READY",
        fromStatus: "APPROVED",
        toStatus: "READY",
        details: { participantCount: participants.length },
      });
      return saved;
    });
  }

  async markDeparted(tripId: number, teamId: string, actorUserId: string, now: Date = new Date()): Promise<Trip> {
    const ds = await getDataSource();
    return ds.transaction(async (manager) => {
      const tripRepo = manager.getRepository(Trip);
      const trip = await tripRepo.findOne({ where: { id: tripId, teamId }, lock: { mode: "pessimistic_write" } });
      if (!trip) throw new Error("Déplacement non trouvé");
      if (trip.workflowStatus !== "READY") throw new Error("Le déplacement doit être READY avant le départ");
      trip.workflowStatus = "DEPARTED";
      trip.departedBy = actorUserId;
      trip.departedAt = now;
      const saved = await tripRepo.save(trip);
      await this.recordEvent(manager, {
        teamId,
        tripId,
        actorUserId,
        transition: "MARK_DEPARTED",
        fromStatus: "READY",
        toStatus: "DEPARTED",
        details: { departedAt: now.toISOString() },
      });
      return saved;
    });
  }

  async addExpense(
    tripId: number,
    teamId: string,
    actorUserId: string,
    input: TripExpenseInput,
  ): Promise<TripExpenseReceipt> {
    const label = input.label.trim();
    if (!label) throw new Error("Libellé de dépense obligatoire");
    validateTripBudget(input.amount);
    if (input.amount <= 0) throw new Error("Le montant de la dépense doit être strictement positif");
    const documentUrl = input.documentUrl?.trim() || null;
    if (documentUrl && !isSafeTripEvidenceLocation(documentUrl)) {
      throw new Error("Emplacement du justificatif invalide");
    }

    const ds = await getDataSource();
    return ds.transaction(async (manager) => {
      const trip = await manager.getRepository(Trip).findOne({
        where: { id: tripId, teamId },
        lock: { mode: "pessimistic_write" },
      });
      if (!trip) throw new Error("Déplacement non trouvé");
      if (!["APPROVED", "READY", "DEPARTED"].includes(trip.workflowStatus)) {
        throw new Error("Les dépenses sont enregistrables après approbation et avant clôture");
      }
      const settings = await this.getSettingsForManager(manager, teamId);
      const receiptRequired = requiresTripReceipt(input.amount, settings.receiptRequiredThreshold);
      if (receiptRequired && !documentUrl) {
        throw new Error("Un justificatif est obligatoire pour cette dépense");
      }

      const expenseRepo = manager.getRepository(TripExpenseReceipt);
      const expense = await expenseRepo.save(
        expenseRepo.create({
          teamId,
          tripId,
          label,
          amount: input.amount.toFixed(3),
          receiptThresholdSnapshot: settings.receiptRequiredThreshold.toFixed(3),
          receiptRequired,
          documentUrl,
          status: "ACTIVE",
          voidedBy: null,
          voidedAt: null,
          createdBy: actorUserId,
        }),
      );
      await this.recordEvent(manager, {
        teamId,
        tripId,
        actorUserId,
        transition: "RECORD_EXPENSE",
        fromStatus: trip.workflowStatus,
        toStatus: trip.workflowStatus,
        details: { expenseId: expense.id, label, amount: expense.amount, receiptRequired },
      });
      return expense;
    });
  }

  async removeExpense(expenseId: string, tripId: number, teamId: string, actorUserId: string): Promise<void> {
    const ds = await getDataSource();
    await ds.transaction(async (manager) => {
      const trip = await manager.getRepository(Trip).findOne({
        where: { id: tripId, teamId },
        lock: { mode: "pessimistic_write" },
      });
      if (!trip) throw new Error("Déplacement non trouvé");
      if (!["APPROVED", "READY", "DEPARTED"].includes(trip.workflowStatus)) {
        throw new Error("La dépense ne peut plus être retirée");
      }
      const repo = manager.getRepository(TripExpenseReceipt);
      const expense = await repo.findOne({ where: { id: expenseId, tripId, teamId, status: "ACTIVE" } });
      if (!expense) throw new Error("Dépense active introuvable");
      expense.status = "VOIDED";
      expense.voidedBy = actorUserId;
      expense.voidedAt = new Date();
      await repo.save(expense);
      await this.recordEvent(manager, {
        teamId,
        tripId,
        actorUserId,
        transition: "VOID_EXPENSE",
        fromStatus: trip.workflowStatus,
        toStatus: trip.workflowStatus,
        details: { expenseId, amount: expense.amount, documentRetained: Boolean(expense.documentUrl) },
      });
    });
  }

  async completeTrip(tripId: number, teamId: string, actorUserId: string, now: Date = new Date()): Promise<Trip> {
    const ds = await getDataSource();
    return ds.transaction(async (manager) => {
      const repo = manager.getRepository(Trip);
      const trip = await repo.findOne({ where: { id: tripId, teamId }, lock: { mode: "pessimistic_write" } });
      if (!trip) throw new Error("Déplacement non trouvé");
      if (trip.workflowStatus !== "DEPARTED") throw new Error("Le déplacement doit être parti avant clôture");
      const expenses = await manager.getRepository(TripExpenseReceipt).find({
        where: { tripId, teamId, status: "ACTIVE" },
      });
      const missingEvidence = expenses.filter((expense) => expense.receiptRequired && !expense.documentUrl);
      if (missingEvidence.length > 0) throw new Error("Des justificatifs obligatoires sont manquants");
      const actualBudget = expenses.reduce((total, expense) => total + Number(expense.amount), 0);
      trip.actualBudget = actualBudget.toFixed(3);
      trip.workflowStatus = "COMPLETED";
      trip.completedBy = actorUserId;
      trip.completedAt = now;
      const saved = await repo.save(trip);
      await this.recordEvent(manager, {
        teamId,
        tripId,
        actorUserId,
        transition: "COMPLETE_TRIP",
        fromStatus: "DEPARTED",
        toStatus: "COMPLETED",
        details: { actualBudget: trip.actualBudget, expenseCount: expenses.length },
      });
      return saved;
    });
  }

  async cancelTrip(tripId: number, teamId: string, actorUserId: string, reason: string): Promise<Trip> {
    const normalizedReason = reason.trim();
    if (normalizedReason.length < 3) throw new Error("Motif d'annulation obligatoire");
    const ds = await getDataSource();
    return ds.transaction(async (manager) => {
      const tripRepo = manager.getRepository(Trip);
      const approvalRepo = manager.getRepository(TripBudgetApproval);
      const trip = await tripRepo.findOne({ where: { id: tripId, teamId }, lock: { mode: "pessimistic_write" } });
      if (!trip) throw new Error("Déplacement non trouvé");
      if (!["DRAFT", "APPROVAL_PENDING", "APPROVED", "READY"].includes(trip.workflowStatus)) {
        throw new Error(`Annulation impossible depuis ${trip.workflowStatus}`);
      }
      const fromStatus = trip.workflowStatus;
      if (trip.workflowStatus === "APPROVAL_PENDING") {
        const approvals = await approvalRepo.find({ where: { teamId, tripId, status: "PENDING" } });
        for (const approval of approvals) {
          approval.status = "CANCELLED";
          approval.resolvedAt = new Date();
          await approvalRepo.save(approval);
        }
      }
      trip.workflowStatus = "CANCELLED";
      trip.cancelledBy = actorUserId;
      trip.cancelledAt = new Date();
      trip.cancellationReason = normalizedReason;
      const saved = await tripRepo.save(trip);
      await this.recordEvent(manager, {
        teamId,
        tripId,
        actorUserId,
        transition: "CANCEL_TRIP",
        fromStatus,
        toStatus: "CANCELLED",
        details: { reason: normalizedReason },
      });
      return saved;
    });
  }

  private settingsValue(row: TripGovernanceSettings | null): TripGovernanceSettingsValue {
    return {
      dualApprovalThreshold: row ? Number(row.dualApprovalThreshold) : 0,
      receiptRequiredThreshold: row ? Number(row.receiptRequiredThreshold) : 0,
      version: row?.version ?? 0,
    };
  }

  private async getSettingsForManager(manager: EntityManager, teamId: string): Promise<TripGovernanceSettingsValue> {
    const row = await manager.getRepository(TripGovernanceSettings).findOne({ where: { teamId } });
    return this.settingsValue(row);
  }

  private async initializeParticipantConsents(manager: EntityManager, trip: Trip): Promise<void> {
    const repo = manager.getRepository(TripParticipant);
    const participants = await repo.find({ where: { tripId: trip.id }, relations: ["player"] });
    for (const participant of participants) {
      const required =
        participant.participantType === "PLAYER" &&
        playerRequiresTripConsent(participant.player?.birthDate ?? null, trip.departureTime);
      participant.consentStatus = required ? "PENDING" : "NOT_REQUIRED";
      participant.consentRecordedBy = null;
      participant.consentRecordedAt = null;
      participant.consentNote = null;
      await repo.save(participant);
    }
  }

  private async recordEvent(
    manager: EntityManager,
    input: {
      teamId: string;
      tripId: number;
      participantId?: number | null;
      actorUserId: string;
      transition: string;
      fromStatus?: TripWorkflowStatus | string | null;
      toStatus: TripWorkflowStatus | string;
      details?: Record<string, unknown>;
    },
  ): Promise<void> {
    const repo = manager.getRepository(TripWorkflowEvent);
    await repo.save(
      repo.create({
        teamId: input.teamId,
        tripId: input.tripId,
        participantId: input.participantId ?? null,
        actorUserId: input.actorUserId,
        transition: input.transition,
        fromStatus: input.fromStatus ?? null,
        toStatus: input.toStatus,
        details: eventDetails(input.details ?? {}),
      }),
    );
  }
}

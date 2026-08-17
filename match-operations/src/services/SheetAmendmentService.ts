import { In } from "typeorm";
import { getDataSource } from "@/lib/db";
import { Sheet } from "@/entities/Sheet";
import {
  SheetAmendment,
  type SheetAmendmentApprovalStatus,
  type SheetAmendmentStatus,
} from "@/entities/SheetAmendment";
import { CompetitionMatchProtocolService } from "./CompetitionMatchProtocolService";

const OPEN_STATUSES: SheetAmendmentStatus[] = ["AMENDMENT_REQUESTED", "AMENDED"];
const MIN_REASON_LENGTH = 5;

export interface AmendmentActor {
  actorUserId: string | null;
  actorName: string | null;
}

export type AmendmentDecision = "APPROVE" | "REJECT";

function requireReason(reason: string | null | undefined, message: string): string {
  const normalized = reason?.trim();
  if (!normalized || normalized.length < MIN_REASON_LENGTH) throw new Error(message);
  return normalized;
}

function isExecutableApproval(status: SheetAmendmentApprovalStatus): boolean {
  return status === "NOT_REQUIRED" || status === "APPROVED";
}

export class SheetAmendmentService {
  private protocolService = new CompetitionMatchProtocolService();

  private async openCandidates(sheetId: number): Promise<SheetAmendment[]> {
    const ds = await getDataSource();
    return ds.getRepository(SheetAmendment).find({
      where: { sheetId, status: In(OPEN_STATUSES) },
      order: { requestedAt: "DESC" },
    });
  }

  async findOpen(sheetId: number): Promise<SheetAmendment | null> {
    const candidates = await this.openCandidates(sheetId);
    return candidates.find((amendment) => amendment.approvalStatus !== "REJECTED") ?? null;
  }

  async findExecutable(sheetId: number): Promise<SheetAmendment | null> {
    const candidates = await this.openCandidates(sheetId);
    return candidates.find((amendment) => isExecutableApproval(amendment.approvalStatus)) ?? null;
  }

  async listBySheet(sheetId: number): Promise<SheetAmendment[]> {
    const ds = await getDataSource();
    return ds.getRepository(SheetAmendment).find({ where: { sheetId }, order: { requestedAt: "ASC" } });
  }

  async request(
    sheetId: number,
    reason: string,
    actor: AmendmentActor,
    now = new Date(),
  ): Promise<SheetAmendment> {
    const normalizedReason = requireReason(reason, "Un motif d'amendement est obligatoire");
    const ds = await getDataSource();
    return ds.transaction(async (manager) => {
      const sheet = await manager.getRepository(Sheet).findOne({ where: { id: sheetId } });
      if (!sheet) throw new Error("Feuille de match introuvable");
      if (sheet.status !== "POST_MATCH_SIGNED" && sheet.status !== "CLOSED") {
        throw new Error("Un amendement n'est possible que sur une feuille post-match signée ou clôturée");
      }

      const repo = manager.getRepository(SheetAmendment);
      const existingCandidates = await repo.find({
        where: { sheetId, status: In(OPEN_STATUSES) },
        order: { requestedAt: "DESC" },
      });
      const existing = existingCandidates.find((amendment) => amendment.approvalStatus !== "REJECTED");
      if (existing) return existing;

      const protocol = await this.protocolService.getForMatch(sheet.matchId, manager);
      if (protocol.postSignatureCorrectionWindowMinutes != null) {
        const reference = sheet.postMatchSignedAt ?? sheet.closedAt;
        if (!reference) {
          throw new Error("Impossible d'appliquer la fenêtre de correction : horodatage de signature absent");
        }
        const deadline = new Date(reference.getTime() + protocol.postSignatureCorrectionWindowMinutes * 60_000);
        if (now.getTime() > deadline.getTime()) {
          throw new Error(
            `La fenêtre de correction post-signature (${protocol.postSignatureCorrectionWindowMinutes} min) est expirée`,
          );
        }
      }

      const approvalStatus: SheetAmendmentApprovalStatus =
        protocol.postSignatureFederationApprovalRequired ? "PENDING" : "NOT_REQUIRED";
      return repo.save(
        repo.create({
          sheetId,
          matchId: sheet.matchId,
          status: "AMENDMENT_REQUESTED",
          originalSheetStatus: sheet.status,
          reason: normalizedReason,
          requestedByUserId: actor.actorUserId,
          requestedByName: actor.actorName,
          protocolVersionUsed: protocol.version,
          approvalStatus,
          decidedByUserId: null,
          decidedByName: null,
          decisionReason: null,
          decidedAt: null,
          amendedAt: null,
          reSignedAt: null,
        }),
      );
    });
  }

  async decide(
    sheetId: number,
    amendmentId: number,
    decision: AmendmentDecision,
    reason: string | null | undefined,
    actor: AmendmentActor,
  ): Promise<SheetAmendment> {
    const ds = await getDataSource();
    return ds.transaction(async (manager) => {
      const repo = manager.getRepository(SheetAmendment);
      const amendment = await repo.findOne({ where: { id: amendmentId, sheetId } });
      if (!amendment) throw new Error("Demande d'amendement introuvable");
      if (amendment.status !== "AMENDMENT_REQUESTED" || amendment.approvalStatus !== "PENDING") {
        throw new Error("Cette demande d'amendement n'attend plus de décision Fédération");
      }

      amendment.approvalStatus = decision === "APPROVE" ? "APPROVED" : "REJECTED";
      amendment.decidedByUserId = actor.actorUserId;
      amendment.decidedByName = actor.actorName;
      amendment.decisionReason =
        decision === "REJECT"
          ? requireReason(reason, "Un motif de rejet est obligatoire")
          : reason?.trim() || null;
      amendment.decidedAt = new Date();
      return repo.save(amendment);
    });
  }

  async markAmended(sheetId: number): Promise<SheetAmendment | null> {
    const amendment = await this.findExecutable(sheetId);
    if (!amendment) return null;
    if (amendment.status === "AMENDMENT_REQUESTED") {
      const ds = await getDataSource();
      amendment.status = "AMENDED";
      amendment.amendedAt = new Date();
      await ds.getRepository(SheetAmendment).save(amendment);
    }
    return amendment;
  }

  async markReSigned(sheetId: number): Promise<SheetAmendment | null> {
    const ds = await getDataSource();
    const repo = ds.getRepository(SheetAmendment);
    const amendment = await repo.findOne({ where: { sheetId, status: "AMENDED" }, order: { requestedAt: "DESC" } });
    if (!amendment || !isExecutableApproval(amendment.approvalStatus)) return null;
    amendment.status = "RE_SIGNED";
    amendment.reSignedAt = new Date();
    return repo.save(amendment);
  }
}

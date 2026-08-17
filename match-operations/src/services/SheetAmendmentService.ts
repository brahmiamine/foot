import { In } from "typeorm";
import { getDataSource } from "@/lib/db";
import { Sheet } from "@/entities/Sheet";
import { SheetAmendment, type SheetAmendmentStatus } from "@/entities/SheetAmendment";
import { assertReason } from "./EventCorrectionService";

const OPEN_STATUSES: SheetAmendmentStatus[] = ["AMENDMENT_REQUESTED", "AMENDED"];

export interface AmendmentActor {
  actorUserId: string | null;
  actorName: string | null;
}

export class SheetAmendmentService {
  async findOpen(sheetId: number): Promise<SheetAmendment | null> {
    const ds = await getDataSource();
    return ds.getRepository(SheetAmendment).findOne({
      where: { sheetId, status: In(OPEN_STATUSES) },
      order: { requestedAt: "DESC" },
    });
  }

  async listBySheet(sheetId: number): Promise<SheetAmendment[]> {
    const ds = await getDataSource();
    return ds.getRepository(SheetAmendment).find({
      where: { sheetId },
      order: { requestedAt: "ASC" },
    });
  }

  async request(sheetId: number, reason: string, actor: AmendmentActor): Promise<SheetAmendment> {
    const normalizedReason = assertReason(reason);
    const ds = await getDataSource();
    return ds.transaction(async (manager) => {
      const sheet = await manager.getRepository(Sheet).findOne({ where: { id: sheetId } });
      if (!sheet) throw new Error("Feuille de match introuvable");
      if (sheet.status !== "POST_MATCH_SIGNED" && sheet.status !== "CLOSED") {
        throw new Error("Un amendement n'est possible que sur une feuille post-match signée ou clôturée");
      }

      const repo = manager.getRepository(SheetAmendment);
      const existing = await repo.findOne({
        where: { sheetId, status: In(OPEN_STATUSES) },
        order: { requestedAt: "DESC" },
      });
      if (existing) return existing;

      return repo.save(
        repo.create({
          sheetId,
          matchId: sheet.matchId,
          status: "AMENDMENT_REQUESTED",
          originalSheetStatus: sheet.status,
          reason: normalizedReason,
          requestedByUserId: actor.actorUserId,
          requestedByName: actor.actorName,
          amendedAt: null,
          reSignedAt: null,
        }),
      );
    });
  }

  async markAmended(sheetId: number): Promise<SheetAmendment | null> {
    const ds = await getDataSource();
    const repo = ds.getRepository(SheetAmendment);
    const amendment = await repo.findOne({
      where: { sheetId, status: In(OPEN_STATUSES) },
      order: { requestedAt: "DESC" },
    });
    if (!amendment) return null;
    if (amendment.status === "AMENDMENT_REQUESTED") {
      amendment.status = "AMENDED";
      amendment.amendedAt = new Date();
      await repo.save(amendment);
    }
    return amendment;
  }

  async markReSigned(sheetId: number): Promise<SheetAmendment | null> {
    const ds = await getDataSource();
    const repo = ds.getRepository(SheetAmendment);
    const amendment = await repo.findOne({ where: { sheetId, status: "AMENDED" }, order: { requestedAt: "DESC" } });
    if (!amendment) return null;
    amendment.status = "RE_SIGNED";
    amendment.reSignedAt = new Date();
    return repo.save(amendment);
  }
}

import { In } from "typeorm";
import { getDataSource } from "@/lib/db";
import { Sheet } from "@/entities/Sheet";
import { Match } from "@/entities/Match";
import { SheetAmendment } from "@/entities/SheetAmendment";

export class SheetClosedError extends Error {
  constructor() {
    super("Cette feuille de match est clôturée : plus aucune saisie n'est possible.");
    this.name = "SheetClosedError";
  }
}

export class SheetSignedAmendmentRequiredError extends Error {
  constructor() {
    super("Cette feuille est signée : ouvrez un amendement avant toute correction.");
    this.name = "SheetSignedAmendmentRequiredError";
  }
}

export class SheetAmendmentApprovalRequiredError extends Error {
  constructor() {
    super("Cette demande d'amendement doit être approuvée par la Fédération avant correction.");
    this.name = "SheetAmendmentApprovalRequiredError";
  }
}

export class MatchCancelledError extends Error {
  constructor() {
    super("Ce match a été annulé : plus aucune saisie n'est possible.");
    this.name = "MatchCancelledError";
  }
}

export interface SheetEditOptions {
  /**
   * Les écritures live ordinaires restent interdites après signature. Seules
   * les opérations de correction/annulation auditées peuvent utiliser un
   * amendement autorisé (`NOT_REQUIRED` ou `APPROVED`).
   */
  allowSignedAmendment?: boolean;
}

export async function assertSheetEditable(sheetId: number, options: SheetEditOptions = {}): Promise<void> {
  const dataSource = await getDataSource();
  const sheet = await dataSource.getRepository(Sheet).findOne({ where: { id: sheetId } });
  if (!sheet) return;

  const match = await dataSource.getRepository(Match).findOne({ where: { id: sheet.matchId } });
  if (match?.status === "CANCELLED") throw new MatchCancelledError();

  if (sheet.status === "POST_MATCH_SIGNED" || sheet.status === "CLOSED") {
    if (options.allowSignedAmendment) {
      const amendments = await dataSource.getRepository(SheetAmendment).find({
        where: { sheetId, status: In(["AMENDMENT_REQUESTED", "AMENDED"]) },
        order: { requestedAt: "DESC" },
      });
      const executable = amendments.find(
        (amendment) => amendment.approvalStatus === "NOT_REQUIRED" || amendment.approvalStatus === "APPROVED",
      );
      if (executable) return;
      if (amendments.some((amendment) => amendment.approvalStatus === "PENDING")) {
        throw new SheetAmendmentApprovalRequiredError();
      }
    }
    if (sheet.status === "CLOSED" && !options.allowSignedAmendment) throw new SheetClosedError();
    throw new SheetSignedAmendmentRequiredError();
  }
}

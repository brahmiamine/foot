"use server";

import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/lib/i18n/actionFeedback";
import { SheetService } from "@/services/SheetService";
import { SignatureService } from "@/services/SignatureService";
import { ReservationService } from "@/services/ReservationService";
import { MatchService } from "@/services/MatchService";
import { notify } from "@/lib/notificationClient";
import type { ActorRole, SignaturePhase } from "@/entities/Signature";

/** Enregistre (ou remplace) la signature d'un acteur pour une phase donnée. */
export async function saveSignature(
  sheetId: number,
  phase: SignaturePhase,
  actorRole: ActorRole,
  signerName: string | null,
  signatureData: string
): Promise<ActionResult> {
  try {
    if (!signatureData) {
      return { success: false, error: "actions.signatures.errors.required" };
    }

    const sheetService = new SheetService();
    const sheet = await sheetService.findById(sheetId);
    if (!sheet) {
      return { success: false, error: "actions.sheet.errors.notFound" };
    }
    if (sheet.status === "CLOSED") {
      return { success: false, error: "actions.sheet.errors.locked" };
    }

    const signatureService = new SignatureService();
    await signatureService.save(sheetId, phase, actorRole, { signerName, signatureData });

    revalidatePath(`/${sheet.matchId}/post-match`);
    return { success: true, message: "actions.signatures.messages.saved" };
  } catch {
    return {
      success: false,
      error: "actions.signatures.errors.save",
    };
  }
}

/** Ajoute une réserve après-match. */
export async function addReservation(sheetId: number, phase: SignaturePhase, authorRole: ActorRole, content: string): Promise<ActionResult> {
  try {
    if (!content || !content.trim()) {
      return { success: false, error: "actions.reservations.errors.required" };
    }

    const sheetService = new SheetService();
    const sheet = await sheetService.findById(sheetId);
    if (!sheet) {
      return { success: false, error: "actions.sheet.errors.notFound" };
    }
    if (sheet.status === "CLOSED") {
      return { success: false, error: "actions.sheet.errors.locked" };
    }

    const reservationService = new ReservationService();
    await reservationService.create({ sheetId, phase, authorRole, content: content.trim() });

    revalidatePath(`/${sheet.matchId}/post-match`);
    return { success: true, message: "actions.reservations.messages.added" };
  } catch {
    return {
      success: false,
      error: "actions.reservations.errors.add",
    };
  }
}

export async function deleteReservation(id: number, matchId: string): Promise<ActionResult> {
  try {
    const reservationService = new ReservationService();
    await reservationService.delete(id);

    revalidatePath(`/${matchId}/post-match`);
    return { success: true, message: "actions.reservations.messages.deleted" };
  } catch {
    return {
      success: false,
      error: "actions.reservations.errors.delete",
    };
  }
}

/**
 * Clôture la feuille de match : nécessite les 3 signatures après-match,
 * fait passer la feuille par POST_MATCH_SIGNED puis CLOSED (deux mises à
 * jour de statut séquentielles). Action définitive — no-op si déjà clôturée.
 */
export async function confirmPostMatch(sheetId: number, matchId: string): Promise<ActionResult> {
  try {
    const sheetService = new SheetService();
    const signatureService = new SignatureService();

    const sheet = await sheetService.findById(sheetId);
    if (!sheet) {
      return { success: false, error: "actions.sheet.errors.notFound" };
    }
    if (sheet.status === "CLOSED") {
      return { success: false, error: "actions.closure.errors.alreadyClosed" };
    }

    const complete = await signatureService.isPhaseComplete(sheetId, "POST_MATCH");
    if (!complete) {
      return {
        success: false,
        error: "actions.closure.errors.signaturesRequired",
        errorParams: { count: 3 },
      };
    }

    await sheetService.updateStatus(sheetId, "POST_MATCH_SIGNED");
    await sheetService.updateStatus(sheetId, "CLOSED");

    revalidatePath(`/${matchId}/post-match`);
    revalidatePath(`/${matchId}`);
    await notifyMatchSheetClosed(matchId);
    return { success: true, message: "actions.closure.messages.closed" };
  } catch {
    return {
      success: false,
      error: "actions.closure.errors.close",
    };
  }
}

/**
 * Notifie les deux clubs (staff ADMIN/OBSERVATEUR via notification-api) que
 * la feuille de match est désormais scellée. N'échoue jamais l'action de
 * clôture : une erreur ici est journalisée et avalée.
 */
async function notifyMatchSheetClosed(matchId: string): Promise<void> {
  const match = await new MatchService().findById(matchId);
  if (!match) return;

  const matchName = `${match.homeTeam?.nom ?? "?"} - ${match.awayTeam?.nom ?? "?"}`;
  const data = { matchId, matchName };

  for (const [side, teamId] of [
    ["home", match.equipeHome],
    ["away", match.equipeAway],
  ] as const) {
    await notify({
      eventId: `match-sheet-closed:${matchId}:${side}`,
      type: "MATCH_SHEET_CLOSED",
      target: { type: "TEAM", teamId },
      teamId,
      category: "MATCH_SHEET_CLOSED",
      title: "Feuille de match clôturée",
      body: `La feuille de match de ${matchName} a été signée et clôturée.`,
      data,
    });
  }
}

"use server";

import { revalidatePath } from "next/cache";
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
) {
  try {
    if (!signatureData) {
      return { success: false, error: "Veuillez signer avant de valider." };
    }

    const sheetService = new SheetService();
    const sheet = await sheetService.findById(sheetId);
    if (!sheet) {
      return { success: false, error: "Feuille de match introuvable." };
    }
    if (sheet.status === "CLOSED") {
      return { success: false, error: "La feuille est clôturée, elle ne peut plus être modifiée." };
    }

    const signatureService = new SignatureService();
    await signatureService.save(sheetId, phase, actorRole, { signerName, signatureData });

    revalidatePath(`/${sheet.matchId}/post-match`);
    return { success: true, message: "Signature enregistrée." };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur lors de l'enregistrement de la signature.",
    };
  }
}

/** Ajoute une réserve après-match. */
export async function addReservation(sheetId: number, phase: SignaturePhase, authorRole: ActorRole, content: string) {
  try {
    if (!content || !content.trim()) {
      return { success: false, error: "Le contenu de la réserve ne peut pas être vide." };
    }

    const sheetService = new SheetService();
    const sheet = await sheetService.findById(sheetId);
    if (!sheet) {
      return { success: false, error: "Feuille de match introuvable." };
    }
    if (sheet.status === "CLOSED") {
      return { success: false, error: "La feuille est clôturée, elle ne peut plus être modifiée." };
    }

    const reservationService = new ReservationService();
    await reservationService.create({ sheetId, phase, authorRole, content: content.trim() });

    revalidatePath(`/${sheet.matchId}/post-match`);
    return { success: true, message: "Réserve ajoutée." };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur lors de l'ajout de la réserve.",
    };
  }
}

export async function deleteReservation(id: number, matchId: string) {
  try {
    const reservationService = new ReservationService();
    await reservationService.delete(id);

    revalidatePath(`/${matchId}/post-match`);
    return { success: true, message: "Réserve supprimée." };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur lors de la suppression de la réserve.",
    };
  }
}

/**
 * Clôture la feuille de match : nécessite les 3 signatures après-match,
 * fait passer la feuille par POST_MATCH_SIGNED puis CLOSED (deux mises à
 * jour de statut séquentielles). Action définitive — no-op si déjà clôturée.
 */
export async function confirmPostMatch(sheetId: number, matchId: string) {
  try {
    const sheetService = new SheetService();
    const signatureService = new SignatureService();

    const sheet = await sheetService.findById(sheetId);
    if (!sheet) {
      return { success: false, error: "Feuille de match introuvable." };
    }
    if (sheet.status === "CLOSED") {
      return { success: false, error: "La feuille est déjà clôturée." };
    }

    const complete = await signatureService.isPhaseComplete(sheetId, "POST_MATCH");
    if (!complete) {
      return {
        success: false,
        error: "Les 3 signatures (domicile, extérieur, arbitre) sont requises avant de clôturer.",
      };
    }

    await sheetService.updateStatus(sheetId, "POST_MATCH_SIGNED");
    await sheetService.updateStatus(sheetId, "CLOSED");

    revalidatePath(`/${matchId}/post-match`);
    revalidatePath(`/${matchId}`);
    await notifyMatchSheetClosed(matchId);
    return { success: true, message: "Feuille de match clôturée." };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur lors de la clôture.",
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

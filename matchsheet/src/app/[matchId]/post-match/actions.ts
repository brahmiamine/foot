"use server";

import { revalidatePath } from "next/cache";
import { SheetService } from "@/services/SheetService";
import { SignatureService } from "@/services/SignatureService";
import { ReservationService } from "@/services/ReservationService";
import { MatchService } from "@/services/MatchService";
import { PlatformNotificationService } from "@/services/PlatformNotificationService";
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

    try {
      const matchService = new MatchService();
      const match = await matchService.findById(matchId);
      const notificationService = new PlatformNotificationService();
      const teamIds = [match?.homeTeam?.id, match?.awayTeam?.id].filter((id): id is string => Boolean(id));
      for (const teamId of teamIds) {
        await notificationService.notifyTeam(teamId, {
          type: "MATCHSHEET_CLOSED",
          title: "Feuille de match clôturée",
          body: `La feuille du match ${match?.homeTeam?.nom ?? "?"} vs ${match?.awayTeam?.nom ?? "?"} a été clôturée.`,
        });
      }
    } catch (notifyError) {
      // Ne bloque jamais la clôture de la feuille pour une erreur de notification.
      console.error("Error sending matchsheet closed notification:", notifyError);
    }

    revalidatePath(`/${matchId}/post-match`);
    revalidatePath(`/${matchId}`);
    return { success: true, message: "Feuille de match clôturée." };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur lors de la clôture.",
    };
  }
}

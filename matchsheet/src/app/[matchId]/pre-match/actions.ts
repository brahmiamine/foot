"use server";

import { revalidatePath } from "next/cache";
import { SheetService } from "@/services/SheetService";
import { SignatureService } from "@/services/SignatureService";
import { ReservationService } from "@/services/ReservationService";
import type { ActorRole, SignaturePhase } from "@/entities/Signature";

/**
 * Enregistre (ou remplace) la signature d'un acteur pour une phase donnée.
 * `phase` est passé explicitement (plutôt que codé en dur) car ce fichier
 * suit la même forme que post-match/actions.ts.
 */
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

    const signatureService = new SignatureService();
    await signatureService.save(sheetId, phase, actorRole, { signerName, signatureData });

    revalidatePath(`/${sheet.matchId}/pre-match`);
    return { success: true, message: "Signature enregistrée." };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur lors de l'enregistrement de la signature.",
    };
  }
}

/** Ajoute une réserve avant-match. */
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

    const reservationService = new ReservationService();
    await reservationService.create({ sheetId, phase, authorRole, content: content.trim() });

    revalidatePath(`/${sheet.matchId}/pre-match`);
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

    revalidatePath(`/${matchId}/pre-match`);
    return { success: true, message: "Réserve supprimée." };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur lors de la suppression de la réserve.",
    };
  }
}

/**
 * Confirme la phase avant-match : ne fait passer la feuille à
 * PRE_MATCH_SIGNED que si les 3 signatures sont réunies et que la feuille
 * est encore en DRAFT (idempotent si déjà confirmée).
 */
export async function confirmPreMatch(sheetId: number, matchId: string) {
  try {
    const sheetService = new SheetService();
    const signatureService = new SignatureService();

    const complete = await signatureService.isPhaseComplete(sheetId, "PRE_MATCH");
    if (!complete) {
      return {
        success: false,
        error: "Les 3 signatures (domicile, extérieur, arbitre) sont requises avant de continuer.",
      };
    }

    const sheet = await sheetService.findById(sheetId);
    if (sheet && sheet.status === "DRAFT") {
      await sheetService.updateStatus(sheetId, "PRE_MATCH_SIGNED");
    }

    revalidatePath(`/${matchId}/pre-match`);
    revalidatePath(`/${matchId}`);
    return { success: true, message: "Avant-match confirmé." };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur lors de la confirmation.",
    };
  }
}

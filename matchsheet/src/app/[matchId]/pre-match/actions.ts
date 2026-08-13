"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/lib/i18n/actionFeedback";
import { SheetService, SheetVersionConflictError } from "@/services/SheetService";
import { SignatureService } from "@/services/SignatureService";
import { ReservationService } from "@/services/ReservationService";
import { MatchOfficialService } from "@/services/MatchOfficialService";
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

    const requestHeaders = await headers();
    const signatureService = new SignatureService();
    await signatureService.save(
      sheetId,
      sheet.matchId,
      phase,
      actorRole,
      { signerName, signatureData },
      { userId: requestHeaders.get("x-sso-user-id"), name: requestHeaders.get("x-sso-name") },
    );

    revalidatePath(`/${sheet.matchId}/pre-match`);
    return { success: true, message: "actions.signatures.messages.saved" };
  } catch {
    return {
      success: false,
      error: "actions.signatures.errors.save",
    };
  }
}

/** Ajoute une réserve avant-match. */
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

    const reservationService = new ReservationService();
    await reservationService.create({ sheetId, phase, authorRole, content: content.trim() });

    revalidatePath(`/${sheet.matchId}/pre-match`);
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

    revalidatePath(`/${matchId}/pre-match`);
    return { success: true, message: "actions.reservations.messages.deleted" };
  } catch {
    return {
      success: false,
      error: "actions.reservations.errors.delete",
    };
  }
}

/**
 * Confirme la phase avant-match : ne fait passer la feuille à
 * PRE_MATCH_SIGNED que si les 3 signatures sont réunies et que la feuille
 * est encore en DRAFT (idempotent si déjà confirmée).
 *
 * `expectedVersion` (TASK-P0-010) : version de la feuille telle que
 * connue par l'écran appelant (chargée à l'affichage de la page). Si un
 * autre officiel a déjà transitionné la feuille entre-temps,
 * `updateStatus` lève `SheetVersionConflictError` plutôt que d'écraser ce
 * changement concurrent — l'appelant doit recharger avant de réessayer.
 */
export async function confirmPreMatch(sheetId: number, matchId: string, expectedVersion: number): Promise<ActionResult> {
  try {
    const sheetService = new SheetService();
    const signatureService = new SignatureService();
    const officialService = new MatchOfficialService();

    const officialsConfirmed = await officialService.areMandatoryRolesConfirmed(sheetId);
    if (!officialsConfirmed) {
      return {
        success: false,
        error: "actions.preMatch.errors.officialsRequired",
      };
    }

    const complete = await signatureService.isPhaseComplete(sheetId, "PRE_MATCH");
    if (!complete) {
      return {
        success: false,
        error: "actions.preMatch.errors.signaturesRequired",
        errorParams: { count: 3 },
      };
    }

    const sheet = await sheetService.findById(sheetId);
    if (sheet && sheet.status === "DRAFT") {
      await sheetService.updateStatus(sheetId, "PRE_MATCH_SIGNED", expectedVersion);
    }

    revalidatePath(`/${matchId}/pre-match`);
    revalidatePath(`/${matchId}`);
    return { success: true, message: "actions.preMatch.messages.confirmed" };
  } catch (error) {
    if (error instanceof SheetVersionConflictError) {
      return { success: false, error: "actions.sheet.errors.conflict", conflict: true };
    }
    return {
      success: false,
      error: "actions.preMatch.errors.confirm",
    };
  }
}

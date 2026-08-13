"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { CardEventService } from "@/services/CardEventService";
import { GoalService } from "@/services/GoalService";
import { InjuryService } from "@/services/InjuryService";
import { SubstitutionService } from "@/services/SubstitutionService";
import { SheetService, SheetVersionConflictError } from "@/services/SheetService";
import type { CardType, MatchPeriod } from "@/entities/Card";
import type { ActionResult } from "@/lib/i18n/actionFeedback";

async function currentActor(): Promise<{ userId: string | null; name: string | null }> {
  const requestHeaders = await headers();
  return { userId: requestHeaders.get("x-sso-user-id"), name: requestHeaders.get("x-sso-name") };
}

/** Ajoute un carton (jaune/rouge/double jaune) — écrit directement dans la table Card partagée. */
export async function addCard(
  sheetId: number,
  matchId: string,
  playerId: string,
  type: CardType,
  minute: number | null,
  period: MatchPeriod,
  cardReasonId: string | null,
  commentFr: string | null,
): Promise<ActionResult> {
  try {
    if (!playerId) return { success: false, error: "events.validation.selectPlayer" };
    const cardEventService = new CardEventService();
    await cardEventService.create({ sheetId, matchId, playerId, type, minute, period, cardReasonId, commentFr });
    revalidatePath(`/${matchId}/live`);
    return { success: true, message: "actions.events.card.saved" };
  } catch {
    return { success: false, error: "actions.events.card.addError" };
  }
}

export async function deleteCard(id: string, matchId: string): Promise<ActionResult> {
  try {
    const cardEventService = new CardEventService();
    await cardEventService.delete(id);
    revalidatePath(`/${matchId}/live`);
    return { success: true, message: "actions.events.card.deleted" };
  } catch {
    return { success: false, error: "actions.events.card.deleteError" };
  }
}

/**
 * Enregistre un but (joueur optionnel — but non identifié).
 * `clientRequestId` (TASK-P0-025) : généré une fois par le client au moment
 * de la soumission (voir LiveMatchSheet.tsx) — un double-clic ou un retry
 * réseau renvoie le but déjà créé plutôt que d'en créer un doublon.
 */
export async function addGoal(
  sheetId: number,
  matchId: string,
  teamId: string,
  playerId: string | null,
  minute: number,
  period: MatchPeriod,
  isOwnGoal: boolean,
  isPenalty: boolean,
  clientRequestId?: string,
): Promise<ActionResult> {
  try {
    if (!teamId) return { success: false, error: "events.validation.selectTeam" };
    const goalService = new GoalService();
    await goalService.create({ sheetId, matchId, teamId, playerId, minute, period, isOwnGoal, isPenalty, clientRequestId });
    revalidatePath(`/${matchId}/live`);
    return { success: true, message: "actions.events.goal.saved" };
  } catch {
    return { success: false, error: "actions.events.goal.addError" };
  }
}

/**
 * Annule un but déjà saisi (TASK-P0-009) : conserve la ligne pour l'audit
 * (voir GoalService.cancel) au lieu de la supprimer silencieusement — un
 * motif est obligatoire.
 */
export async function cancelGoal(id: number, matchId: string, reason: string): Promise<ActionResult> {
  try {
    const goalService = new GoalService();
    const actor = await currentActor();
    await goalService.cancel(id, { reason, actorUserId: actor.userId, actorName: actor.name });
    revalidatePath(`/${matchId}/live`);
    return { success: true, message: "actions.events.goal.deleted" };
  } catch {
    return { success: false, error: "actions.events.goal.deleteError" };
  }
}

/** Enregistre une blessure constatée pendant le match. `clientRequestId` : voir addGoal. */
export async function addInjury(
  sheetId: number,
  matchId: string,
  teamId: string,
  playerId: string | null,
  minute: number | null,
  period: MatchPeriod | null,
  description: string | null,
  requiresSubstitution: boolean,
  clientRequestId?: string,
): Promise<ActionResult> {
  try {
    if (!teamId) return { success: false, error: "events.validation.selectTeam" };
    const injuryService = new InjuryService();
    await injuryService.create({ sheetId, matchId, teamId, playerId, minute, period, description, requiresSubstitution, clientRequestId });
    revalidatePath(`/${matchId}/live`);
    return { success: true, message: "actions.events.injury.saved" };
  } catch {
    return { success: false, error: "actions.events.injury.addError" };
  }
}

/** Annule une blessure déjà saisie (TASK-P0-009) — voir cancelGoal. */
export async function cancelInjury(id: number, matchId: string, reason: string): Promise<ActionResult> {
  try {
    const injuryService = new InjuryService();
    const actor = await currentActor();
    await injuryService.cancel(id, { reason, actorUserId: actor.userId, actorName: actor.name });
    revalidatePath(`/${matchId}/live`);
    return { success: true, message: "actions.events.injury.deleted" };
  } catch {
    return { success: false, error: "actions.events.injury.deleteError" };
  }
}

/** Enregistre un remplacement (joueur sortant / joueur entrant). `clientRequestId` : voir addGoal. */
export async function addSubstitution(
  sheetId: number,
  matchId: string,
  teamId: string,
  playerOutId: string,
  playerInId: string,
  minute: number,
  period: MatchPeriod,
  clientRequestId?: string,
): Promise<ActionResult> {
  try {
    if (!teamId) return { success: false, error: "events.validation.selectTeam" };
    if (!playerOutId || !playerInId) return { success: false, error: "events.validation.selectBothPlayers" };
    if (playerOutId === playerInId) return { success: false, error: "actions.events.substitution.samePlayer" };
    const substitutionService = new SubstitutionService();
    await substitutionService.create({ sheetId, matchId, teamId, playerOutId, playerInId, minute, period, clientRequestId });
    revalidatePath(`/${matchId}/live`);
    return { success: true, message: "actions.events.substitution.saved" };
  } catch {
    return { success: false, error: "actions.events.substitution.addError" };
  }
}

/** Annule un remplacement déjà saisi (TASK-P0-009) — voir cancelGoal. */
export async function cancelSubstitution(id: number, matchId: string, reason: string): Promise<ActionResult> {
  try {
    const substitutionService = new SubstitutionService();
    const actor = await currentActor();
    await substitutionService.cancel(id, { reason, actorUserId: actor.userId, actorName: actor.name });
    revalidatePath(`/${matchId}/live`);
    return { success: true, message: "actions.events.substitution.deleted" };
  } catch {
    return { success: false, error: "actions.events.substitution.deleteError" };
  }
}

/**
 * Bascule la feuille en statut "En cours" — purement informatif, ne bloque
 * rien. `expectedVersion` (TASK-P0-010) : voir confirmPreMatch.
 */
export async function startMatch(sheetId: number, matchId: string, expectedVersion: number): Promise<ActionResult> {
  try {
    const sheetService = new SheetService();
    await sheetService.updateStatus(sheetId, "IN_PROGRESS", expectedVersion);
    revalidatePath(`/${matchId}/live`);
    return { success: true, message: "actions.events.start.saved" };
  } catch (error) {
    if (error instanceof SheetVersionConflictError) {
      return { success: false, error: "actions.sheet.errors.conflict", conflict: true };
    }
    return { success: false, error: "actions.events.start.error" };
  }
}

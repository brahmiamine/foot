"use server";

import { revalidatePath } from "next/cache";
import { CardEventService } from "@/services/CardEventService";
import { GoalService } from "@/services/GoalService";
import { InjuryService } from "@/services/InjuryService";
import { SubstitutionService } from "@/services/SubstitutionService";
import { SheetService } from "@/services/SheetService";
import type { CardType, MatchPeriod } from "@/entities/Card";

type ActionResult = { success: true; message?: string } | { success: false; error: string };

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
    if (!playerId) return { success: false, error: "Merci de sélectionner un joueur" };
    const cardEventService = new CardEventService();
    await cardEventService.create({ sheetId, matchId, playerId, type, minute, period, cardReasonId, commentFr });
    revalidatePath(`/${matchId}/live`);
    return { success: true, message: "Carton enregistré" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur lors de l'ajout du carton" };
  }
}

export async function deleteCard(id: string, matchId: string): Promise<ActionResult> {
  try {
    const cardEventService = new CardEventService();
    await cardEventService.delete(id);
    revalidatePath(`/${matchId}/live`);
    return { success: true, message: "Carton supprimé" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur lors de la suppression du carton" };
  }
}

/** Enregistre un but (joueur optionnel — but non identifié). */
export async function addGoal(
  sheetId: number,
  matchId: string,
  teamId: string,
  playerId: string | null,
  minute: number,
  period: MatchPeriod,
  isOwnGoal: boolean,
  isPenalty: boolean,
): Promise<ActionResult> {
  try {
    if (!teamId) return { success: false, error: "Merci de sélectionner une équipe" };
    const goalService = new GoalService();
    await goalService.create({ sheetId, matchId, teamId, playerId, minute, period, isOwnGoal, isPenalty });
    revalidatePath(`/${matchId}/live`);
    return { success: true, message: "But enregistré" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur lors de l'ajout du but" };
  }
}

export async function deleteGoal(id: number, matchId: string): Promise<ActionResult> {
  try {
    const goalService = new GoalService();
    await goalService.delete(id);
    revalidatePath(`/${matchId}/live`);
    return { success: true, message: "But supprimé" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur lors de la suppression du but" };
  }
}

/** Enregistre une blessure constatée pendant le match. */
export async function addInjury(
  sheetId: number,
  matchId: string,
  teamId: string,
  playerId: string | null,
  minute: number | null,
  period: MatchPeriod | null,
  description: string | null,
  requiresSubstitution: boolean,
): Promise<ActionResult> {
  try {
    if (!teamId) return { success: false, error: "Merci de sélectionner une équipe" };
    const injuryService = new InjuryService();
    await injuryService.create({ sheetId, matchId, teamId, playerId, minute, period, description, requiresSubstitution });
    revalidatePath(`/${matchId}/live`);
    return { success: true, message: "Blessure enregistrée" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur lors de l'ajout de la blessure" };
  }
}

export async function deleteInjury(id: number, matchId: string): Promise<ActionResult> {
  try {
    const injuryService = new InjuryService();
    await injuryService.delete(id);
    revalidatePath(`/${matchId}/live`);
    return { success: true, message: "Blessure supprimée" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur lors de la suppression de la blessure" };
  }
}

/** Enregistre un remplacement (joueur sortant / joueur entrant). */
export async function addSubstitution(
  sheetId: number,
  matchId: string,
  teamId: string,
  playerOutId: string,
  playerInId: string,
  minute: number,
  period: MatchPeriod,
): Promise<ActionResult> {
  try {
    if (!teamId) return { success: false, error: "Merci de sélectionner une équipe" };
    if (!playerOutId || !playerInId) return { success: false, error: "Merci de sélectionner les deux joueurs" };
    if (playerOutId === playerInId) return { success: false, error: "Le joueur sortant et le joueur entrant doivent être différents" };
    const substitutionService = new SubstitutionService();
    await substitutionService.create({ sheetId, matchId, teamId, playerOutId, playerInId, minute, period });
    revalidatePath(`/${matchId}/live`);
    return { success: true, message: "Remplacement enregistré" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur lors de l'ajout du remplacement" };
  }
}

export async function deleteSubstitution(id: number, matchId: string): Promise<ActionResult> {
  try {
    const substitutionService = new SubstitutionService();
    await substitutionService.delete(id);
    revalidatePath(`/${matchId}/live`);
    return { success: true, message: "Remplacement supprimé" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur lors de la suppression du remplacement" };
  }
}

/** Bascule la feuille en statut "En cours" — purement informatif, ne bloque rien. */
export async function startMatch(sheetId: number, matchId: string): Promise<ActionResult> {
  try {
    const sheetService = new SheetService();
    await sheetService.updateStatus(sheetId, "IN_PROGRESS");
    revalidatePath(`/${matchId}/live`);
    return { success: true, message: "Match démarré" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur lors du démarrage du match" };
  }
}

"use server";

import { MatchService } from "@/services/MatchService";
import { MatchGalleryService } from "@/services/MatchGalleryService";
import { MatchFactsService, type MatchFact } from "@/services/MatchFactsService";
import { requireTeamId } from "@/lib/team-context";
import { revalidatePath } from "next/cache";

/**
 * Server Actions for match visibility and gallery management.
 * Les matchs eux-mêmes (score, date, équipes) sont gérés dans ArbiNote/cardManager.
 */

export async function toggleMatchVisibility(id: string, isPublicVisible: boolean) {
  try {
    const teamId = await requireTeamId();
    const matchService = new MatchService();
    await matchService.setPublicVisible(id, teamId, isPublicVisible);

    revalidatePath("/admin/matches");
    return { success: true, message: "Visibilité mise à jour" };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur lors de la mise à jour",
    };
  }
}

/**
 * Fil des faits de match (buts/cartons/blessures/remplacements) saisis dans
 * la feuille de match électronique (`match-operations`). Vérifie d'abord que le
 * match appartient bien à l'équipe du club connecté avant de lire les
 * tables partagées (voir MatchFactsService, lecture seule).
 */
export async function fetchMatchFacts(matchId: string): Promise<{ success: true; facts: MatchFact[] } | { success: false; error: string }> {
  try {
    const teamId = await requireTeamId();
    const matchService = new MatchService();
    const match = await matchService.findById(matchId, teamId);
    if (!match) {
      throw new Error("Match non trouvé");
    }

    const matchFactsService = new MatchFactsService();
    const facts = await matchFactsService.getFacts(matchId);
    return { success: true, facts };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur lors du chargement des faits de match",
    };
  }
}

export async function addGalleryToMatch(matchId: string, galleryId: number) {
  try {
    const teamId = await requireTeamId();
    const matchService = new MatchService();
    const match = await matchService.findById(matchId, teamId);
    if (!match) {
      throw new Error("Match non trouvé");
    }

    const matchGalleryService = new MatchGalleryService();
    await matchGalleryService.addGalleryToMatch(matchId, galleryId);

    revalidatePath("/admin/matches");
    return { success: true, message: "Galerie ajoutée au match" };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur lors de l'ajout",
    };
  }
}

export async function removeGalleryFromMatch(matchId: string, galleryId: number) {
  try {
    const teamId = await requireTeamId();
    const matchGalleryService = new MatchGalleryService();
    await matchGalleryService.removeGalleryFromMatch(matchId, galleryId, teamId);

    revalidatePath("/admin/matches");
    return { success: true, message: "Galerie retirée du match" };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur lors du retrait",
    };
  }
}

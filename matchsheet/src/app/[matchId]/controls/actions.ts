"use server";

import { revalidatePath } from "next/cache";
import { PlayerControlService } from "@/services/PlayerControlService";

export async function setPlayerControl(sheetId: number, matchId: string, matchLineupId: number, checked: boolean, note: string) {
  try {
    const controlService = new PlayerControlService();
    await controlService.setChecked(sheetId, matchLineupId, checked, note.trim() || null);

    revalidatePath(`/${matchId}/controls`);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur lors de l'enregistrement du contrôle.",
    };
  }
}

"use server";

import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/lib/i18n/actionFeedback";
import { assertCurrentMatchAccess } from "@/lib/matchActorSession";
import { PlayerControlService } from "@/services/PlayerControlService";

export async function setPlayerControl(sheetId: number, matchId: string, matchLineupId: number, checked: boolean, note: string): Promise<ActionResult> {
  try {
    await assertCurrentMatchAccess(matchId);
    const controlService = new PlayerControlService();
    await controlService.setChecked(sheetId, matchLineupId, checked, note.trim() || null);

    revalidatePath(`/${matchId}/controls`);
    return { success: true };
  } catch {
    return {
      success: false,
      error: "actions.controls.errors.save",
    };
  }
}

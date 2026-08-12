"use server";

import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/lib/i18n/actionFeedback";
import { SheetService } from "@/services/SheetService";
import { MatchOfficialService } from "@/services/MatchOfficialService";
import type { OfficialRole } from "@/entities/MatchOfficial";

export async function saveOfficial(
  sheetId: number,
  matchId: string,
  role: OfficialRole,
  fullName: string,
  licenseNumber: string
): Promise<ActionResult> {
  try {
    const sheetService = new SheetService();
    const sheet = await sheetService.findById(sheetId);
    if (!sheet) {
      return { success: false, error: "actions.sheet.errors.notFound" };
    }

    const officialService = new MatchOfficialService();
    await officialService.save(sheetId, role, {
      fullName: fullName.trim() || null,
      licenseNumber: licenseNumber.trim() || null,
    });

    revalidatePath(`/${matchId}/officials`);
    return { success: true, message: "actions.officials.messages.saved" };
  } catch {
    return {
      success: false,
      error: "actions.officials.errors.save",
    };
  }
}

export async function confirmOfficial(sheetId: number, matchId: string, role: OfficialRole): Promise<ActionResult> {
  try {
    const officialService = new MatchOfficialService();
    await officialService.confirm(sheetId, role);

    revalidatePath(`/${matchId}/officials`);
    return { success: true, message: "actions.officials.messages.confirmed" };
  } catch {
    return {
      success: false,
      error: "actions.officials.errors.confirm",
    };
  }
}

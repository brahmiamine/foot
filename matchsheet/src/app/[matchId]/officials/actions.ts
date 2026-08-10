"use server";

import { revalidatePath } from "next/cache";
import { SheetService } from "@/services/SheetService";
import { MatchOfficialService } from "@/services/MatchOfficialService";
import type { OfficialRole } from "@/entities/MatchOfficial";

export async function saveOfficial(
  sheetId: number,
  matchId: string,
  role: OfficialRole,
  fullName: string,
  licenseNumber: string
) {
  try {
    const sheetService = new SheetService();
    const sheet = await sheetService.findById(sheetId);
    if (!sheet) {
      return { success: false, error: "Feuille de match introuvable." };
    }

    const officialService = new MatchOfficialService();
    await officialService.save(sheetId, role, {
      fullName: fullName.trim() || null,
      licenseNumber: licenseNumber.trim() || null,
    });

    revalidatePath(`/${matchId}/officials`);
    return { success: true, message: "Informations enregistrées." };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur lors de l'enregistrement.",
    };
  }
}

export async function confirmOfficial(sheetId: number, matchId: string, role: OfficialRole) {
  try {
    const officialService = new MatchOfficialService();
    await officialService.confirm(sheetId, role);

    revalidatePath(`/${matchId}/officials`);
    return { success: true, message: "Officiel validé." };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur lors de la validation.",
    };
  }
}

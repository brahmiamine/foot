"use server";

import { TeamMemberService } from "@/services/TeamMemberService";
import { requireTeamId } from "@/lib/team-context";
import { createTeamMemberSchema, updateTeamMemberSchema } from "@/types/team-members";
import { revalidatePath } from "next/cache";

/**
 * Server Actions for TeamMember CRUD operations
 */

/**
 * Create a new team member
 */
export async function createTeamMember(formData: FormData) {
  try {
    const startDateStr = formData.get("startDate") as string;
    const endDateStr = formData.get("endDate") as string;
    const memberType = formData.get("memberType") as "PLAYER" | "STAFF";

    const data: {
      playerId?: string | null;
      staffId?: number | null;
      seasonId?: number | null;
      internalTeamId?: number | null;
      status: "ACTIVE" | "SUSPENDED" | "ENDED";
      startDate: Date;
      endDate?: Date | null;
    } = {
      seasonId: formData.get("seasonId") ? parseInt(formData.get("seasonId") as string, 10) : null,
      internalTeamId: formData.get("internalTeamId") ? parseInt(formData.get("internalTeamId") as string, 10) : null,
      status: (formData.get("status") as "ACTIVE" | "SUSPENDED" | "ENDED") || "ACTIVE",
      startDate: startDateStr ? new Date(startDateStr) : new Date(),
      endDate: endDateStr ? new Date(endDateStr) : null,
    };

    // Set playerId or staffId based on memberType
    if (memberType === "PLAYER") {
      const playerIdStr = formData.get("playerId") as string;
      if (!playerIdStr) {
        throw new Error("Veuillez sélectionner un joueur");
      }
      data.playerId = playerIdStr;
      data.staffId = null;
    } else if (memberType === "STAFF") {
      const staffIdStr = formData.get("staffId") as string;
      if (!staffIdStr) {
        throw new Error("Veuillez sélectionner un membre du staff");
      }
      data.staffId = parseInt(staffIdStr, 10);
      data.playerId = null;
    } else {
      throw new Error("Type de membre invalide");
    }

    const validatedData = createTeamMemberSchema.parse(data);
    const teamId = await requireTeamId();
    const teamMemberService = new TeamMemberService();
    await teamMemberService.create(validatedData, teamId);

    revalidatePath("/admin/team-members");
    return { success: true, message: "Membre d'équipe créé avec succès" };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur lors de la création",
    };
  }
}

/**
 * Update a team member
 */
export async function updateTeamMember(id: number, formData: FormData) {
  try {
    const startDateStr = formData.get("startDate") as string;
    const endDateStr = formData.get("endDate") as string;

    const data: {
      seasonId?: number | null;
      internalTeamId?: number | null;
      status?: "ACTIVE" | "SUSPENDED" | "ENDED";
      startDate?: Date;
      endDate?: Date | null;
    } = {};

    if (formData.has("seasonId")) {
      data.seasonId = formData.get("seasonId") ? parseInt(formData.get("seasonId") as string, 10) : null;
    }
    if (formData.has("internalTeamId")) {
      data.internalTeamId = formData.get("internalTeamId") ? parseInt(formData.get("internalTeamId") as string, 10) : null;
    }
    if (formData.has("status")) {
      data.status = formData.get("status") as "ACTIVE" | "SUSPENDED" | "ENDED";
    }
    if (startDateStr) {
      data.startDate = new Date(startDateStr);
    }
    if (formData.has("endDate")) {
      data.endDate = endDateStr ? new Date(endDateStr) : null;
    }

    const validatedData = updateTeamMemberSchema.parse(data);
    const teamId = await requireTeamId();
    const teamMemberService = new TeamMemberService();
    await teamMemberService.update(id, teamId, validatedData);

    revalidatePath("/admin/team-members");
    return { success: true, message: "Membre d'équipe modifié avec succès" };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur lors de la modification",
    };
  }
}

/**
 * Delete a team member
 */
export async function deleteTeamMember(id: number) {
  try {
    const teamId = await requireTeamId();
    const teamMemberService = new TeamMemberService();
    await teamMemberService.delete(id, teamId);

    revalidatePath("/admin/team-members");
    return { success: true, message: "Membre d'équipe supprimé avec succès" };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur lors de la suppression",
    };
  }
}


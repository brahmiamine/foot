"use server";

import { StaffService } from "@/services/StaffService";
import { requireTeamId } from "@/lib/team-context";
import { createStaffSchema, updateStaffSchema } from "@/types/staff";
import { revalidatePath } from "next/cache";

/**
 * Server Actions for Staff CRUD operations
 */

/**
 * Create a new staff member
 */
export async function createStaff(formData: FormData) {
  try {
    const birthDateStr = formData.get("birthDate") as string;
    const birthDate = birthDateStr ? new Date(birthDateStr) : new Date();

    const data = {
      firstNameFr: formData.get("firstNameFr") as string,
      lastNameFr: formData.get("lastNameFr") as string,
      firstNameAr: (formData.get("firstNameAr") as string) || null,
      lastNameAr: (formData.get("lastNameAr") as string) || null,
      birthDate,
      phone: (formData.get("phone") as string) || null,
      imageUrl: (formData.get("imageUrl") as string) || null,
      staffType: (formData.get("staffType") as string) as "COACH" | "ADJOINT" | "KINE" | "MEDECIN" | "PREPARATEUR" | "ANALYSTE" | "EQUIPEMENTIER" | "COMMUNICATION" | "AUTRE",
      userId: formData.get("userId") ? parseInt(formData.get("userId") as string, 10) : null,
    };

    const validatedData = createStaffSchema.parse(data);
    const teamId = await requireTeamId();
    const staffService = new StaffService();
    await staffService.create(validatedData, teamId);

    revalidatePath("/admin/staff");
    return { success: true, message: "Membre du staff créé avec succès" };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur lors de la création",
    };
  }
}

/**
 * Update a staff member
 */
export async function updateStaff(id: number, formData: FormData) {
  try {
    const birthDateStr = formData.get("birthDate") as string;
    const data: {
      firstNameFr?: string;
      lastNameFr?: string;
      firstNameAr?: string | null;
      lastNameAr?: string | null;
      birthDate?: Date;
      phone?: string | null;
      imageUrl?: string | null;
      staffType?: "COACH" | "ADJOINT" | "KINE" | "MEDECIN" | "PREPARATEUR" | "ANALYSTE" | "EQUIPEMENTIER" | "COMMUNICATION" | "AUTRE";
      userId?: number | null;
    } = {};

    if (formData.get("firstNameFr")) {
      data.firstNameFr = formData.get("firstNameFr") as string;
    }
    if (formData.get("lastNameFr")) {
      data.lastNameFr = formData.get("lastNameFr") as string;
    }
    if (formData.has("firstNameAr")) {
      data.firstNameAr = (formData.get("firstNameAr") as string) || null;
    }
    if (formData.has("lastNameAr")) {
      data.lastNameAr = (formData.get("lastNameAr") as string) || null;
    }
    if (birthDateStr) {
      data.birthDate = new Date(birthDateStr);
    }
    if (formData.has("phone")) {
      data.phone = (formData.get("phone") as string) || null;
    }
    if (formData.has("imageUrl")) {
      data.imageUrl = (formData.get("imageUrl") as string) || null;
    }
    if (formData.has("staffType")) {
      data.staffType = (formData.get("staffType") as string) as "COACH" | "ADJOINT" | "KINE" | "MEDECIN" | "PREPARATEUR" | "ANALYSTE" | "EQUIPEMENTIER" | "COMMUNICATION" | "AUTRE";
    }
    if (formData.has("userId")) {
      data.userId = formData.get("userId") ? parseInt(formData.get("userId") as string, 10) : null;
    }

    const validatedData = updateStaffSchema.parse(data);
    const teamId = await requireTeamId();
    const staffService = new StaffService();
    await staffService.update(id, teamId, validatedData);

    revalidatePath("/admin/staff");
    return { success: true, message: "Membre du staff modifié avec succès" };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur lors de la modification",
    };
  }
}

/**
 * Delete a staff member
 */
export async function deleteStaff(id: number) {
  try {
    const teamId = await requireTeamId();
    const staffService = new StaffService();
    await staffService.delete(id, teamId);

    revalidatePath("/admin/staff");
    return { success: true, message: "Membre du staff supprimé avec succès" };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur lors de la suppression",
    };
  }
}

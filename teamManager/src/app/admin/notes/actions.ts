"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { requireTeamId } from "@/lib/team-context";
import { NoteService } from "@/services/NoteService";
import { AuditLogService } from "@/services/AuditLogService";

const createNoteSchema = z.object({
  contentFr: z.string().min(1),
  contentAr: z.string().optional(),
  category: z.enum(["TACTICAL", "DISCIPLINARY", "MEDICAL", "OTHER"]),
  playerId: z.string().optional(),
  matchId: z.string().optional(),
});

const updateNoteSchema = z.object({
  contentFr: z.string().min(1).optional(),
  contentAr: z.string().optional(),
  category: z.enum(["TACTICAL", "DISCIPLINARY", "MEDICAL", "OTHER"]).optional(),
});

/** Crée une note (tactique/disciplinaire/médicale/autre) — réservé ADMIN. */
export async function createNote(formData: FormData) {
  try {
    const session = await auth();
    if (session?.user?.role !== "ADMIN") {
      return { success: false, error: "Action réservée aux administrateurs du club" };
    }

    const data = createNoteSchema.parse({
      contentFr: formData.get("contentFr") as string,
      contentAr: (formData.get("contentAr") as string) || undefined,
      category: formData.get("category") as string,
      playerId: (formData.get("playerId") as string) || undefined,
      matchId: (formData.get("matchId") as string) || undefined,
    });

    const teamId = await requireTeamId();
    const noteService = new NoteService();
    const note = await noteService.create(data, teamId, session.user.id);

    const auditLogService = new AuditLogService();
    await auditLogService.create({
      userId: session.user.id,
      action: "CREATE",
      entity: "Note",
      entityId: note.id,
      after: note,
    });

    revalidatePath("/admin/notes");
    return { success: true, message: "Note créée avec succès" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur lors de la création" };
  }
}

/** Met à jour une note — réservé ADMIN. */
export async function updateNote(id: string, formData: FormData) {
  try {
    const session = await auth();
    if (session?.user?.role !== "ADMIN") {
      return { success: false, error: "Action réservée aux administrateurs du club" };
    }

    const data = updateNoteSchema.parse({
      contentFr: (formData.get("contentFr") as string) || undefined,
      contentAr: (formData.get("contentAr") as string) || undefined,
      category: (formData.get("category") as string) || undefined,
    });

    const teamId = await requireTeamId();
    const noteService = new NoteService();
    const { before, after } = await noteService.update(id, teamId, data);

    const auditLogService = new AuditLogService();
    await auditLogService.create({
      userId: session.user.id,
      action: "UPDATE",
      entity: "Note",
      entityId: id,
      before,
      after,
    });

    revalidatePath("/admin/notes");
    return { success: true, message: "Note modifiée avec succès" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur lors de la modification" };
  }
}

/** Supprime une note — réservé ADMIN. */
export async function deleteNote(id: string) {
  try {
    const session = await auth();
    if (session?.user?.role !== "ADMIN") {
      return { success: false, error: "Action réservée aux administrateurs du club" };
    }

    const teamId = await requireTeamId();
    const noteService = new NoteService();
    const note = await noteService.delete(id, teamId);

    const auditLogService = new AuditLogService();
    await auditLogService.create({
      userId: session.user.id,
      action: "DELETE",
      entity: "Note",
      entityId: id,
      before: note,
    });

    revalidatePath("/admin/notes");
    return { success: true, message: "Note supprimée avec succès" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur lors de la suppression" };
  }
}

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireTeamId } from "@/lib/team-context";
import { getUserAccess, requirePermission } from "@/lib/access";
import { TacticsBoardService } from "@/services/TacticsBoardService";
import { createTacticsBoardSchema, updateTacticsBoardSchema } from "@/types/tactics";

/**
 * Gestion des planches tactiques — chaque coach ne gère que ses propres
 * planches (created/edited/deleted), même avec le droit tactics.manage.
 */

export async function createTacticsBoard(input: {
  title: string;
  description?: string | null;
  category?: string | null;
  isPublic: boolean;
  contentJson: string;
}) {
  try {
    const access = await getUserAccess();
    requirePermission(access, "tactics.manage");

    const data = createTacticsBoardSchema.parse({
      title: input.title,
      description: input.description || null,
      category: input.category || null,
      isPublic: input.isPublic,
      content: JSON.parse(input.contentJson),
    });

    const teamId = await requireTeamId();
    const service = new TacticsBoardService();
    const board = await service.create(data, teamId, access.userId);

    revalidatePath("/admin/tactics");
    return { success: true, id: board.id, message: "Planche créée avec succès" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur lors de la création" };
  }
}

export async function updateTacticsBoard(
  id: number,
  input: { title: string; description?: string | null; category?: string | null; isPublic: boolean; contentJson: string }
) {
  try {
    const access = await getUserAccess();
    requirePermission(access, "tactics.manage");

    const data = updateTacticsBoardSchema.parse({
      title: input.title,
      description: input.description || null,
      category: input.category || null,
      isPublic: input.isPublic,
      content: JSON.parse(input.contentJson),
    });

    const teamId = await requireTeamId();
    const service = new TacticsBoardService();
    await service.update(id, teamId, access.userId, data);

    revalidatePath("/admin/tactics");
    return { success: true, message: "Planche enregistrée avec succès" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur lors de l'enregistrement" };
  }
}

export async function deleteTacticsBoard(id: number) {
  try {
    const access = await getUserAccess();
    requirePermission(access, "tactics.manage");

    const teamId = await requireTeamId();
    const service = new TacticsBoardService();
    await service.delete(id, teamId, access.userId);

    revalidatePath("/admin/tactics");
    return { success: true, message: "Planche supprimée avec succès" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur lors de la suppression" };
  }
}

/** Duplique une planche publique d'un autre coach dans ses propres planches. */
export async function duplicateTacticsBoard(id: number) {
  let newId: number;
  try {
    const access = await getUserAccess();
    requirePermission(access, "tactics.manage");

    const teamId = await requireTeamId();
    const service = new TacticsBoardService();
    const original = await service.findById(id, teamId);
    if (!original || !service.canView(original, access.userId)) {
      throw new Error("Planche non trouvée");
    }

    const copy = await service.create(
      {
        title: `${original.title} (copie)`,
        description: original.description,
        category: original.category,
        isPublic: false,
        content: TacticsBoardService.parseContent(original),
      },
      teamId,
      access.userId
    );
    newId = copy.id;
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur lors de la duplication" };
  }

  revalidatePath("/admin/tactics");
  redirect(`/admin/tactics/${newId}`);
}

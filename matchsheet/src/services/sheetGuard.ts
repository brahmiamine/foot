import { getDataSource } from "@/lib/db";
import { Sheet } from "@/entities/Sheet";

/**
 * Une feuille CLOSED ne doit plus recevoir d'écriture live (carton/but/
 * remplacement/blessure) depuis matchsheet — jusqu'ici seul
 * post-match/actions.ts vérifiait explicitement le statut avant d'écrire ;
 * les services de saisie live n'avaient aucun garde-fou (voir avancement.md).
 * Une feuille rouverte par superadmin (voir SheetService.updateStatus,
 * appelé depuis adminMatches.reopenMatchAdmin côté superadmin) redevient
 * IN_PROGRESS et donc de nouveau éditable via ce même garde-fou.
 */
export class SheetClosedError extends Error {
  constructor() {
    super("Cette feuille de match est clôturée : plus aucune saisie n'est possible.");
    this.name = "SheetClosedError";
  }
}

export async function assertSheetEditable(sheetId: number): Promise<void> {
  const dataSource = await getDataSource();
  const sheet = await dataSource.getRepository(Sheet).findOne({ where: { id: sheetId } });
  if (sheet?.status === "CLOSED") {
    throw new SheetClosedError();
  }
}

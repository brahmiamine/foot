import { getDataSource } from "@/lib/db";
import { Sheet } from "@/entities/Sheet";
import { Match } from "@/entities/Match";

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

/**
 * TASK-P0-003 (todo.md) : un match annulé (`matches.status = 'CANCELLED'`,
 * écrit par superadmin, voir cancelMatchAdmin) ne doit plus recevoir de
 * saisie live non plus — sans lien direct avec le statut CLOSED de la
 * feuille (une feuille peut rester DRAFT/PRE_MATCH_SIGNED au moment de
 * l'annulation, si l'annulation intervient avant le coup d'envoi).
 * `matches` est une table partagée lue directement (même base, voir
 * db/OWNERSHIP.md) : aucun appel réseau vers superadmin n'est nécessaire,
 * matchsheet voit l'annulation dès qu'elle est écrite.
 */
export class MatchCancelledError extends Error {
  constructor() {
    super("Ce match a été annulé : plus aucune saisie n'est possible.");
    this.name = "MatchCancelledError";
  }
}

export async function assertSheetEditable(sheetId: number): Promise<void> {
  const dataSource = await getDataSource();
  const sheet = await dataSource.getRepository(Sheet).findOne({ where: { id: sheetId } });
  if (!sheet) return;
  if (sheet.status === "CLOSED") {
    throw new SheetClosedError();
  }
  const match = await dataSource.getRepository(Match).findOne({ where: { id: sheet.matchId } });
  if (match?.status === "CANCELLED") {
    throw new MatchCancelledError();
  }
}

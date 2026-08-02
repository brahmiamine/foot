import { requireTeamId } from "@/lib/team-context";
import { NoteService } from "@/services/NoteService";
import { NotesList } from "./NotesList";

export const dynamic = "force-dynamic";

/** Page Notes — port de cardManager/app/[locale]/admin/dashboard/notes. */
export default async function NotesPage() {
  const teamId = await requireTeamId();
  const noteService = new NoteService();
  const notesData = await noteService.findAllByTeam(teamId);

  const notes = notesData.map((n) => ({
    id: n.id,
    contentFr: n.contentFr,
    category: n.category,
    createdAt: n.createdAt instanceof Date ? n.createdAt.toISOString() : new Date(n.createdAt).toISOString(),
    author: n.author ? { name: n.author.name } : null,
    player: n.player ? { firstNameFr: n.player.firstNameFr, lastNameFr: n.player.lastNameFr } : null,
    matchLabel: n.match
      ? `J${n.match.matchday?.number ?? "?"} — ${n.match.homeTeam?.nom ?? ""} vs ${n.match.awayTeam?.nom ?? ""}`
      : null,
  }));

  return <NotesList initialNotes={notes} />;
}

import { requireTeamId } from "@/lib/team-context";
import { PlayerService } from "@/services/PlayerService";
import { FineForm } from "../FineForm";

export const dynamic = "force-dynamic";

export default async function CreateFinePage() {
  const teamId = await requireTeamId();
  const playerService = new PlayerService();
  const players = await playerService.findAll(teamId);

  return (
    <FineForm players={players.map((p) => ({ id: p.id, label: `#${p.number} ${p.firstNameFr} ${p.lastNameFr}` }))} />
  );
}

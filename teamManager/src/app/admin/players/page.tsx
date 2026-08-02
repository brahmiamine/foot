import { PlayerService } from "@/services/PlayerService";
import { requireTeamId } from "@/lib/team-context";
import { PlayersList } from "./PlayersList";

/**
 * Admin Players List Page
 * Displays the list of players
 */
export default async function PlayersPage() {
  const teamId = await requireTeamId();
  const playerService = new PlayerService();
  const playersData = await playerService.findAll(teamId);

  const players = playersData.map((player) => ({
    id: player.id,
    firstNameFr: player.firstNameFr || "",
    lastNameFr: player.lastNameFr || "",
    firstNameAr: player.firstNameAr || null,
    lastNameAr: player.lastNameAr || null,
    number: player.number,
    status: player.status,
    isActive: player.isActive,
    birthDate: player.birthDate ? new Date(player.birthDate).toISOString().split("T")[0] : null,
    position: player.position || null,
    imageUrl: player.imageUrl || null,
    createdAt: player.createdAt instanceof Date ? player.createdAt.toISOString() : new Date(player.createdAt).toISOString(),
    updatedAt: player.updatedAt ? (player.updatedAt instanceof Date ? player.updatedAt.toISOString() : new Date(player.updatedAt).toISOString()) : null,
  }));

  return <PlayersList initialPlayers={players} />;
}

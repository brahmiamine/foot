import Link from "next/link";
import { PlayerService } from "@/services/PlayerService";
import { requireTeamId } from "@/lib/team-context";
import { getUserAccess, can } from "@/lib/access";
import { PlayersList } from "./PlayersList";

/**
 * Admin Players List Page
 * Displays the list of players, filtrée par les catégories que l'utilisateur
 * connecté est autorisé à voir (coach scopé à sa catégorie, secrétaire = tout).
 */
export default async function PlayersPage() {
  const teamId = await requireTeamId();
  const access = await getUserAccess();
  const playerService = new PlayerService();
  const playersData = await playerService.findAll(teamId, access.categories);

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
    category: player.category,
    createdAt: player.createdAt instanceof Date ? player.createdAt.toISOString() : new Date(player.createdAt).toISOString(),
    updatedAt: player.updatedAt ? (player.updatedAt instanceof Date ? player.updatedAt.toISOString() : new Date(player.updatedAt).toISOString()) : null,
  }));

  const canEdit = can(access, "players.edit");
  return (
    <>
      {canEdit && (
        <div className="container-fluid pt-3 text-end">
          <Link href="/admin/players/profile-requests" className="btn btn-outline-primary btn-sm">
            Demandes de modification de profil
          </Link>
        </div>
      )}
      <PlayersList
        initialPlayers={players}
        canCreate={can(access, "players.create")}
        canEdit={canEdit}
        canDelete={can(access, "players.delete")}
      />
    </>
  );
}

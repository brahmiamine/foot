import { PlayerService } from "@/services/PlayerService";
import { requireTeamId } from "@/lib/team-context";
import { PlayerForm } from "../../PlayerForm";
import { notFound } from "next/navigation";

/**
 * Admin Players Edit Page
 * Page for editing an existing player
 */
export default async function EditPlayerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const teamId = await requireTeamId();
  const playerService = new PlayerService();
  const player = await playerService.findById(id, teamId);

  if (!player) {
    notFound();
  }

  const createdAtStr =
    player.createdAt instanceof Date ? player.createdAt.toISOString() : new Date(player.createdAt).toISOString();
  const updatedAtStr = player.updatedAt
    ? player.updatedAt instanceof Date
      ? player.updatedAt.toISOString()
      : new Date(player.updatedAt).toISOString()
    : null;

  const playerData = {
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
    createdAt: createdAtStr,
    updatedAt: updatedAtStr,
  };

  return <PlayerForm mode="edit" initialData={playerData} />;
}

import { redirect } from "next/navigation";
import { requireTeamId } from "@/lib/team-context";
import { getUserAccess, can } from "@/lib/access";
import { GuardianService } from "@/services/GuardianService";
import { PlayerService } from "@/services/PlayerService";
import { GuardiansManagement } from "./GuardiansManagement";

export const dynamic = "force-dynamic";

/** Page Parents & tuteurs — jamais rattachée au modèle de comptes User partagé. */
export default async function GuardiansPage() {
  const teamId = await requireTeamId();
  const access = await getUserAccess();
  if (!can(access, "guardians.view") && !can(access, "guardians.manage")) {
    redirect("/admin");
  }

  const guardianService = new GuardianService();
  const playerService = new PlayerService();

  const [guardiansData, playersData] = await Promise.all([guardianService.findAll(teamId), playerService.findAll(teamId, access.categories)]);

  const links = await guardianService.findLinksByTeam(guardiansData.map((g) => g.id));
  const linksByGuardian = new Map<number, typeof links>();
  for (const link of links) {
    const list = linksByGuardian.get(link.guardianId) ?? [];
    list.push(link);
    linksByGuardian.set(link.guardianId, list);
  }

  const guardians = guardiansData.map((g) => ({
    id: g.id,
    firstName: g.firstName,
    lastName: g.lastName,
    phone: g.phone ?? null,
    email: g.email ?? null,
    address: g.address ?? null,
    links: (linksByGuardian.get(g.id) ?? []).map((l) => ({
      id: l.id,
      playerId: l.playerId,
      playerLabel: l.player ? `#${l.player.number} ${l.player.firstNameFr} ${l.player.lastNameFr}` : "Joueur inconnu",
      relationship: l.relationship ?? null,
      isPrimary: l.isPrimary,
      receivesNotifications: l.receivesNotifications,
      receivesDocuments: l.receivesDocuments,
    })),
  }));

  const players = playersData.map((p) => ({ id: p.id, label: `#${p.number} ${p.firstNameFr} ${p.lastNameFr}` }));

  return <GuardiansManagement initialGuardians={guardians} players={players} canManage={can(access, "guardians.manage")} />;
}

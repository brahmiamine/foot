import { redirect } from "next/navigation";
import { requireTeamId } from "@/lib/team-context";
import { getUserAccess, can } from "@/lib/access";
import { LicenseService } from "@/services/LicenseService";
import { PlayerService } from "@/services/PlayerService";
import { StaffService } from "@/services/StaffService";
import { SeasonService } from "@/services/SeasonService";
import { LicensesManagement } from "./LicensesManagement";

export const dynamic = "force-dynamic";

/** Page Licences — licences FTF des joueurs et du staff (cache/suivi manuel, pas la source officielle). */
export default async function LicensesPage() {
  const teamId = await requireTeamId();
  const access = await getUserAccess();
  if (!can(access, "licenses.view") && !can(access, "licenses.manage")) {
    redirect("/admin");
  }

  const licenseService = new LicenseService();
  const playerService = new PlayerService();
  const staffService = new StaffService();
  const seasonService = new SeasonService();

  const [licensesData, playersData, staffData, seasonsData] = await Promise.all([
    licenseService.findAll(teamId),
    playerService.findAll(teamId, access.categories),
    staffService.findAll(teamId, access.categories),
    seasonService.findAll(teamId),
  ]);

  const licenses = licensesData
    .filter((l) => (l.holderType === "PLAYER" ? (l.player ? access.categories === "ALL" || access.categories.includes(l.player.category) : false) : true))
    .map((l) => ({
      id: l.id,
      holderType: l.holderType,
      holderLabel: l.holderType === "PLAYER" ? (l.player ? `#${l.player.number} ${l.player.firstNameFr} ${l.player.lastNameFr}` : "Joueur inconnu") : l.staff ? `${l.staff.firstNameFr} ${l.staff.lastNameFr}` : "Staff inconnu",
      seasonName: l.season?.name ?? null,
      licenseNumber: l.licenseNumber ?? null,
      licenseType: l.licenseType,
      status: l.status,
      issuedAt: l.issuedAt ?? null,
      expiresAt: l.expiresAt ?? null,
      documentUrl: l.documentUrl ?? null,
      notes: l.notes ?? null,
    }));

  const players = playersData.map((p) => ({ id: p.id, label: `#${p.number} ${p.firstNameFr} ${p.lastNameFr}` }));
  const staff = staffData.map((s) => ({ id: s.id, label: `${s.firstNameFr} ${s.lastNameFr}` }));
  const seasons = seasonsData.map((s) => ({ id: s.id, name: s.name }));

  return <LicensesManagement initialLicenses={licenses} players={players} staff={staff} seasons={seasons} canManage={can(access, "licenses.manage")} />;
}

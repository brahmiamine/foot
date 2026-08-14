import { TeamMemberService } from "@/services/TeamMemberService";
import { PlayerService } from "@/services/PlayerService";
import { StaffService } from "@/services/StaffService";
import { requireTeamId } from "@/lib/team-context";
import { TeamMembersManagement, type TeamMemberData, type PlayerData, type StaffData } from "./TeamMembersManagement";

/**
 * Admin Team Members Page
 * Unified page with list and form on the same page
 */
export default async function TeamMembersPage() {
  const teamId = await requireTeamId();

  const teamMemberService = new TeamMemberService();
  const membersData = await teamMemberService.findAll(teamId);

  const teamMembers: TeamMemberData[] = membersData.map((member) => {
    const startDateStr =
      member.startDate instanceof Date ? member.startDate.toISOString().split("T")[0] : new Date(member.startDate).toISOString().split("T")[0];
    const endDateStr = member.endDate
      ? member.endDate instanceof Date
        ? member.endDate.toISOString().split("T")[0]
        : new Date(member.endDate).toISOString().split("T")[0]
      : null;

    return {
      id: member.id,
      playerId: member.playerId ?? null,
      staffId: member.staffId ?? null,
      status: member.status || "ACTIVE",
      startDate: startDateStr,
      endDate: endDateStr,
      player: member.player
        ? {
            id: member.player.id,
            firstNameFr: member.player.firstNameFr,
            lastNameFr: member.player.lastNameFr,
            firstNameAr: member.player.firstNameAr ?? null,
            lastNameAr: member.player.lastNameAr ?? null,
          }
        : null,
      staff: member.staff
        ? {
            id: member.staff.id,
            firstNameFr: member.staff.firstNameFr,
            lastNameFr: member.staff.lastNameFr,
            firstNameAr: member.staff.firstNameAr ?? null,
            lastNameAr: member.staff.lastNameAr ?? null,
            staffType: member.staff.staffType,
          }
        : null,
      createdAt: member.createdAt.toISOString(),
    };
  });

  const playerService = new PlayerService();
  const playersData = await playerService.findAll(teamId);
  const players: PlayerData[] = playersData.map((player) => ({
    id: player.id,
    firstNameFr: player.firstNameFr,
    lastNameFr: player.lastNameFr,
    firstNameAr: player.firstNameAr ?? null,
    lastNameAr: player.lastNameAr ?? null,
  }));

  const staffService = new StaffService();
  const staffData = await staffService.findAll(teamId);
  const staff: StaffData[] = staffData.map((staffMember) => ({
    id: staffMember.id,
    firstNameFr: staffMember.firstNameFr,
    lastNameFr: staffMember.lastNameFr,
    firstNameAr: staffMember.firstNameAr ?? null,
    lastNameAr: staffMember.lastNameAr ?? null,
    staffType: staffMember.staffType,
  }));

  return <TeamMembersManagement initialTeamMembers={teamMembers} players={players} staff={staff} />;
}

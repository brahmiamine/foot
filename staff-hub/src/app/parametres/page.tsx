import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getUserAccess, can } from "@/lib/access";
import { staffPortalService } from "@/services/StaffPortalService";
import { StaffSettingsForms } from "@/components/portal/StaffSettingsForms";

export default async function ParametresPage() {
  const session = await auth();
  if (!session) return null;
  const access = await getUserAccess();
  if (!access.isClubAdmin && !can(access, "staffSettings.manage")) redirect("/");

  const { teamId } = session.user;
  const [lineupLockPolicy, trainingApprovalPolicy, statReviewPolicy, delegations, staff, matches] = await Promise.all([
    staffPortalService.getLineupLockPolicy(teamId),
    staffPortalService.getTrainingApprovalPolicy(teamId),
    staffPortalService.getStatReviewPolicy(teamId),
    staffPortalService.listHeadCoachDelegations(teamId),
    staffPortalService.getStaffList(teamId, "ALL"),
    staffPortalService.listMatches(teamId),
  ]);

  const qualifiedStaff = staff.filter((member) => member.staffType === "COACH" || member.staffType === "ADJOINT");
  const now = Date.now();
  const upcomingMatches = matches
    .filter((match) => match.date && match.date.getTime() >= now)
    .slice(0, 20)
    .map((match) => ({
      kind: match.kind,
      id: match.id,
      label: `${match.date?.toLocaleDateString("fr-FR")} — ${match.isHome ? "vs " : "@ "}${match.opponentName}`,
    }));

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <div>
        <h1 style={{ fontSize: "1.2rem", margin: 0 }}>Réglages du staff</h1>
        <p style={{ margin: "6px 0 0", color: "var(--sh-text-muted)", fontSize: ".85rem" }}>
          Politiques serveur de gouvernance : verrouillage de la composition, validation des plans d&apos;entraînement,
          revue des statistiques et délégations temporaires d&apos;entraîneur principal.
        </p>
      </div>
      <StaffSettingsForms
        lineupLockPolicy={{ enabled: lineupLockPolicy.enabled, lockMinutesBeforeKickoff: lineupLockPolicy.lockMinutesBeforeKickoff }}
        trainingApprovalPolicy={{ approvalRequired: trainingApprovalPolicy.approvalRequired }}
        statReviewPolicy={{ reviewWindowHours: statReviewPolicy.reviewWindowHours }}
        delegations={delegations.map((delegation) => ({
          id: delegation.id,
          delegateeUserId: delegation.delegateeUserId,
          matchId: delegation.matchId,
          friendlyMatchId: delegation.friendlyMatchId,
          validFrom: delegation.validFrom?.toISOString() ?? null,
          validUntil: delegation.validUntil?.toISOString() ?? null,
          reason: delegation.reason,
          revokedAt: delegation.revokedAt?.toISOString() ?? null,
        }))}
        qualifiedStaff={qualifiedStaff.map((member) => ({
          id: member.id,
          label: `${member.firstNameFr} ${member.lastNameFr} (${member.staffType})`,
        }))}
        upcomingMatches={upcomingMatches}
      />
    </div>
  );
}

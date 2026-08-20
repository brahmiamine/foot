import Link from "next/link";
import { can, getUserAccess, requirePermission } from "@/lib/access";
import { requireTeamId } from "@/lib/team-context";
import { TripService } from "@/services/TripService";
import { TripWorkflowService, playerRequiresTripConsent } from "@/services/TripWorkflowService";
import { TripGovernanceQueryService } from "@/services/TripGovernanceQueryService";
import { TripGovernanceManagement } from "./TripGovernanceManagement";

export const dynamic = "force-dynamic";

export default async function TripGovernancePage() {
  const access = await getUserAccess();
  requirePermission(access, "trips.view");
  const teamId = await requireTeamId();
  if (access.teamId !== teamId) throw new Error("Contexte club incohérent");

  const tripService = new TripService();
  const workflowService = new TripWorkflowService();
  const queryService = new TripGovernanceQueryService();
  const tripsData = await tripService.findAll(teamId, access.categories);
  const tripIds = tripsData.map((trip) => trip.id);
  const [participants, approvals, expenses, events, settings] = await Promise.all([
    tripService.findParticipantsByTripIds(tripIds),
    queryService.listPendingApprovals(teamId, tripIds),
    queryService.listExpenses(teamId, tripIds),
    queryService.listEvents(teamId, tripIds),
    workflowService.getGovernanceSettings(teamId),
  ]);

  const participantsByTrip = new Map<number, typeof participants>();
  for (const participant of participants) {
    const list = participantsByTrip.get(participant.tripId) ?? [];
    list.push(participant);
    participantsByTrip.set(participant.tripId, list);
  }
  const approvalByTrip = new Map(approvals.map((approval) => [approval.tripId, approval]));
  const expensesByTrip = new Map<number, typeof expenses>();
  for (const expense of expenses) {
    const list = expensesByTrip.get(expense.tripId) ?? [];
    list.push(expense);
    expensesByTrip.set(expense.tripId, list);
  }
  const eventsByTrip = new Map<number, typeof events>();
  for (const event of events) {
    const list = eventsByTrip.get(event.tripId) ?? [];
    list.push(event);
    eventsByTrip.set(event.tripId, list);
  }

  const trips = tripsData.map((trip) => {
    const tripParticipants = participantsByTrip.get(trip.id) ?? [];
    const approval = approvalByTrip.get(trip.id);
    const tripExpenses = expensesByTrip.get(trip.id) ?? [];
    return {
      id: trip.id,
      category: trip.category,
      matchLabel:
        trip.matchType === "FRIENDLY"
          ? `Amical @ ${trip.friendlyMatch?.opponentTeam?.nom ?? trip.friendlyMatch?.opponentName ?? "Adversaire"}`
          : trip.matchType === "OFFICIAL"
            ? `${trip.match?.homeTeam?.nom ?? "?"} vs ${trip.match?.awayTeam?.nom ?? "?"}`
            : "Déplacement",
      departureTime: trip.departureTime.toISOString(),
      meetingPoint: trip.meetingPoint ?? null,
      workflowStatus: trip.workflowStatus,
      estimatedBudget: trip.estimatedBudget !== null && trip.estimatedBudget !== undefined ? Number(trip.estimatedBudget) : null,
      approvedBudget: trip.approvedBudget !== null && trip.approvedBudget !== undefined ? Number(trip.approvedBudget) : null,
      actualBudget: trip.actualBudget !== null && trip.actualBudget !== undefined ? Number(trip.actualBudget) : null,
      cancellationReason: trip.cancellationReason ?? null,
      approval: approval
        ? {
            id: approval.id,
            approvalMode: approval.approvalMode,
            requiredApprovals: approval.requiredApprovals,
            collectedApprovals: approval.collectedApprovals,
            estimatedBudget: approval.estimatedBudget,
            threshold: approval.threshold,
            isMaker: approval.makerUserId === access.userId,
          }
        : null,
      participants: tripParticipants.map((participant) => ({
        id: participant.id,
        label:
          participant.participantType === "PLAYER"
            ? participant.player
              ? `#${participant.player.number} ${participant.player.firstNameFr} ${participant.player.lastNameFr}`
              : "Joueur inconnu"
            : participant.name ?? "—",
        participantType: participant.participantType,
        consentRequired:
          participant.participantType === "PLAYER" &&
          playerRequiresTripConsent(participant.player?.birthDate ?? null, trip.departureTime),
        consentStatus: participant.consentStatus,
        consentNote: participant.consentNote ?? null,
      })),
      expenses: tripExpenses.map((expense) => ({
        id: expense.id,
        label: expense.label,
        amount: Number(expense.amount),
        receiptRequired: expense.receiptRequired,
        documentUrl: expense.documentUrl ?? null,
      })),
      events: (eventsByTrip.get(trip.id) ?? []).slice(0, 8).map((event) => ({
        id: event.id,
        transition: event.transition,
        fromStatus: event.fromStatus ?? null,
        toStatus: event.toStatus,
        createdAt: event.createdAt.toISOString(),
      })),
    };
  });

  return (
    <div>
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-4">
        <div>
          <h1 className="h3 mb-1">Gouvernance des déplacements</h1>
          <p className="text-muted mb-0">Budget, approbations, consentements, justificatifs et clôture.</p>
        </div>
        <Link href="/admin/trips" className="btn btn-outline-secondary">
          Organisation logistique
        </Link>
      </div>
      <TripGovernanceManagement
        initialTrips={trips}
        settings={settings}
        canManage={can(access, "trips.manage")}
        canApprove={can(access, "trips.approve")}
      />
    </div>
  );
}

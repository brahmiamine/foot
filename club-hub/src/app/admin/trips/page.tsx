import { requireTeamId } from "@/lib/team-context";
import { getUserAccess, can, selectableCategories } from "@/lib/access";
import { TripService } from "@/services/TripService";
import { MatchService } from "@/services/MatchService";
import { FriendlyMatchService } from "@/services/FriendlyMatchService";
import { PlayerService } from "@/services/PlayerService";
import { AGE_CATEGORIES } from "@/types/categories";
import { TripsManagement } from "./TripsManagement";

export const dynamic = "force-dynamic";

/** Page Déplacements — organisation des matchs à l'extérieur (transport, participants). */
export default async function TripsPage() {
  const teamId = await requireTeamId();
  const access = await getUserAccess();

  const tripService = new TripService();
  const matchService = new MatchService();
  const friendlyMatchService = new FriendlyMatchService();
  const playerService = new PlayerService();

  const [tripsData, matchesData, friendlyMatchesData, playersData] = await Promise.all([
    tripService.findAll(teamId, access.categories),
    matchService.findAll(teamId),
    friendlyMatchService.findAll(teamId, access.categories),
    playerService.findAll(teamId, access.categories),
  ]);

  const [vehiclesByTrip, participantsByTrip] = await Promise.all([
    Promise.all(tripsData.map(async (t) => ({ tripId: t.id, vehicles: await tripService.findVehicles(t.id) }))),
    Promise.all(tripsData.map(async (t) => ({ tripId: t.id, participants: await tripService.findParticipants(t.id) }))),
  ]);
  const vehiclesMap = new Map(vehiclesByTrip.map((e) => [e.tripId, e.vehicles]));
  const participantsMap = new Map(participantsByTrip.map((e) => [e.tripId, e.participants]));

  const trips = tripsData.map((t) => ({
    id: t.id,
    category: t.category,
    matchLabel: t.matchType === "FRIENDLY" ? `Amical @ ${t.friendlyMatch?.opponentTeam?.nom ?? t.friendlyMatch?.opponentName ?? "Adversaire"}` : t.matchType === "OFFICIAL" ? `${t.match?.homeTeam?.nom ?? "?"} vs ${t.match?.awayTeam?.nom ?? "?"}` : "Déplacement",
    departureTime: t.departureTime.toISOString(),
    meetingPoint: t.meetingPoint ?? null,
    notes: t.notes ?? null,
    vehicles: (vehiclesMap.get(t.id) ?? []).map((v) => ({ id: v.id, vehicleType: v.vehicleType, label: v.label ?? null, driverName: v.driverName ?? null, seats: v.seats })),
    participants: (participantsMap.get(t.id) ?? []).map((p) => ({
      id: p.id,
      participantType: p.participantType,
      label: p.participantType === "PLAYER" ? (p.player ? `#${p.player.number} ${p.player.firstNameFr} ${p.player.lastNameFr}` : "Joueur inconnu") : (p.name ?? "—"),
      transportOffer: p.transportOffer,
      offeredSeats: p.offeredSeats ?? null,
      confirmed: p.confirmed,
    })),
  }));

  const awayOfficialMatches = matchesData
    .filter((m) => m.equipeAway === teamId)
    .map((m) => ({ value: `OFFICIAL:${m.id}`, label: `${m.homeTeam?.nom ?? "?"} vs ${m.awayTeam?.nom ?? "?"} — ${m.date ? new Date(m.date).toLocaleDateString("fr-FR") : ""}` }));
  const awayFriendlyMatches = friendlyMatchesData
    .filter((m) => !m.isHome)
    .map((m) => ({ value: `FRIENDLY:${m.id}`, label: `Amical @ ${m.opponentTeam?.nom ?? m.opponentName ?? "Adversaire"} — ${new Date(m.date).toLocaleDateString("fr-FR")}` }));

  const players = playersData.filter((p) => p.isActive).map((p) => ({ id: p.id, label: `#${p.number} ${p.firstNameFr} ${p.lastNameFr}` }));

  return (
    <TripsManagement
      initialTrips={trips}
      awayMatches={[...awayOfficialMatches, ...awayFriendlyMatches]}
      players={players}
      allowedCategories={selectableCategories(access, AGE_CATEGORIES)}
      canManage={can(access, "trips.manage")}
    />
  );
}

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

  const tripIds = tripsData.map((trip) => trip.id);
  const [vehicles, participants] = await Promise.all([
    tripService.findVehiclesByTripIds(tripIds),
    tripService.findParticipantsByTripIds(tripIds),
  ]);

  const vehiclesMap = new Map<number, typeof vehicles>();
  for (const vehicle of vehicles) {
    const current = vehiclesMap.get(vehicle.tripId) ?? [];
    current.push(vehicle);
    vehiclesMap.set(vehicle.tripId, current);
  }

  const participantsMap = new Map<number, typeof participants>();
  for (const participant of participants) {
    const current = participantsMap.get(participant.tripId) ?? [];
    current.push(participant);
    participantsMap.set(participant.tripId, current);
  }

  const trips = tripsData.map((trip) => ({
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
    notes: trip.notes ?? null,
    vehicles: (vehiclesMap.get(trip.id) ?? []).map((vehicle) => ({
      id: vehicle.id,
      vehicleType: vehicle.vehicleType,
      label: vehicle.label ?? null,
      driverName: vehicle.driverName ?? null,
      seats: vehicle.seats,
    })),
    participants: (participantsMap.get(trip.id) ?? []).map((participant) => ({
      id: participant.id,
      participantType: participant.participantType,
      label:
        participant.participantType === "PLAYER"
          ? participant.player
            ? `#${participant.player.number} ${participant.player.firstNameFr} ${participant.player.lastNameFr}`
            : "Joueur inconnu"
          : (participant.name ?? "—"),
      transportOffer: participant.transportOffer,
      offeredSeats: participant.offeredSeats ?? null,
      confirmed: participant.confirmed,
    })),
  }));

  const awayOfficialMatches = matchesData
    .filter((match) => match.equipeAway === teamId)
    .map((match) => ({
      value: `OFFICIAL:${match.id}`,
      label: `${match.homeTeam?.nom ?? "?"} vs ${match.awayTeam?.nom ?? "?"} — ${
        match.date ? new Date(match.date).toLocaleDateString("fr-FR") : ""
      }`,
    }));
  const awayFriendlyMatches = friendlyMatchesData
    .filter((match) => !match.isHome)
    .map((match) => ({
      value: `FRIENDLY:${match.id}`,
      label: `Amical @ ${match.opponentTeam?.nom ?? match.opponentName ?? "Adversaire"} — ${new Date(
        match.date
      ).toLocaleDateString("fr-FR")}`,
    }));

  const players = playersData
    .filter((player) => player.isActive)
    .map((player) => ({
      id: player.id,
      label: `#${player.number} ${player.firstNameFr} ${player.lastNameFr}`,
    }));

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

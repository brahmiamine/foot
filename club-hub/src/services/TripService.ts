import { getDataSource } from "@/lib/database";
import { Trip, type TripMatchKind } from "@/entities/Trip";
import { TripVehicle } from "@/entities/TripVehicle";
import { TripParticipant, type TripParticipantType, type TripTransportOffer } from "@/entities/TripParticipant";
import { In, type EntityManager, type Repository } from "typeorm";
import type { AgeCategory } from "@/types/categories";
import type { TripVehicleInput } from "@/types/trips";

/** Service for Trip operations — déplacements pour les matchs à l'extérieur. */
export class TripService {
  private async getRepository(): Promise<Repository<Trip>> {
    const dataSource = await getDataSource();
    return dataSource.getRepository(Trip);
  }

  private async getVehicleRepository(): Promise<Repository<TripVehicle>> {
    const dataSource = await getDataSource();
    return dataSource.getRepository(TripVehicle);
  }

  private async getParticipantRepository(): Promise<Repository<TripParticipant>> {
    const dataSource = await getDataSource();
    return dataSource.getRepository(TripParticipant);
  }

  async findAll(teamId: string, categories?: "ALL" | AgeCategory[]): Promise<Trip[]> {
    const repository = await this.getRepository();
    const where =
      categories && categories !== "ALL"
        ? categories.length === 0
          ? null
          : { teamId, category: In(categories) }
        : { teamId };
    if (!where) return [];
    return repository.find({
      where,
      relations: ["match", "match.homeTeam", "match.awayTeam", "friendlyMatch", "friendlyMatch.opponentTeam"],
      order: { departureTime: "ASC" },
    });
  }

  async findById(id: number, teamId: string): Promise<Trip | null> {
    const repository = await this.getRepository();
    return repository.findOne({
      where: { id, teamId },
      relations: ["match", "match.homeTeam", "match.awayTeam", "friendlyMatch", "friendlyMatch.opponentTeam"],
    });
  }

  async findVehicles(tripId: number): Promise<TripVehicle[]> {
    const repository = await this.getVehicleRepository();
    return repository.find({ where: { tripId }, order: { id: "ASC" } });
  }

  async findVehiclesByTripIds(tripIds: number[]): Promise<TripVehicle[]> {
    if (tripIds.length === 0) return [];
    const repository = await this.getVehicleRepository();
    return repository.find({ where: { tripId: In(tripIds) }, order: { tripId: "ASC", id: "ASC" } });
  }

  async findParticipants(tripId: number): Promise<TripParticipant[]> {
    const repository = await this.getParticipantRepository();
    return repository.find({ where: { tripId }, relations: ["player"], order: { createdAt: "ASC" } });
  }

  async findParticipantsByTripIds(tripIds: number[]): Promise<TripParticipant[]> {
    if (tripIds.length === 0) return [];
    const repository = await this.getParticipantRepository();
    return repository.find({
      where: { tripId: In(tripIds) },
      relations: ["player"],
      order: { tripId: "ASC", createdAt: "ASC" },
    });
  }

  async create(
    data: {
      category: AgeCategory;
      matchType?: TripMatchKind | null;
      matchId?: string | null;
      friendlyMatchId?: number | null;
      departureTime: Date;
      meetingPoint?: string | null;
      notes?: string | null;
      vehicles?: TripVehicleInput[];
    },
    teamId: string,
    createdBy: string,
  ): Promise<Trip> {
    const ds = await getDataSource();
    return ds.transaction(async (manager) => {
      const repository = manager.getRepository(Trip);
      const { vehicles, ...tripData } = data;
      const trip = repository.create({ ...tripData, teamId, createdBy, workflowStatus: "DRAFT" });
      const saved = await repository.save(trip);
      if (vehicles && vehicles.length > 0) {
        await this.replaceVehicles(manager, saved.id, vehicles);
      }
      return saved;
    });
  }

  async update(
    id: number,
    teamId: string,
    data: Partial<{
      category: AgeCategory;
      matchType: TripMatchKind | null;
      matchId: string | null;
      friendlyMatchId: number | null;
      departureTime: Date;
      meetingPoint: string | null;
      notes: string | null;
      vehicles: TripVehicleInput[];
    }>,
  ): Promise<Trip> {
    const ds = await getDataSource();
    return ds.transaction(async (manager) => {
      const repository = manager.getRepository(Trip);
      const trip = await repository.findOne({ where: { id, teamId }, lock: { mode: "pessimistic_write" } });
      if (!trip) throw new Error("Déplacement non trouvé");
      this.assertDraft(trip);
      const { vehicles, ...tripData } = data;
      Object.assign(trip, tripData);
      const saved = await repository.save(trip);
      if (vehicles !== undefined) {
        await this.replaceVehicles(manager, id, vehicles);
      }
      return saved;
    });
  }

  async delete(id: number, teamId: string): Promise<boolean> {
    const ds = await getDataSource();
    return ds.transaction(async (manager) => {
      const repository = manager.getRepository(Trip);
      const trip = await repository.findOne({ where: { id, teamId }, lock: { mode: "pessimistic_write" } });
      if (!trip) throw new Error("Déplacement non trouvé");
      this.assertDraft(trip);
      await repository.remove(trip);
      return true;
    });
  }

  async addParticipant(
    tripId: number,
    teamId: string,
    data: {
      participantType: TripParticipantType;
      playerId?: string | null;
      name?: string | null;
      transportOffer: TripTransportOffer;
      offeredSeats?: number | null;
    },
  ): Promise<TripParticipant> {
    const ds = await getDataSource();
    return ds.transaction(async (manager) => {
      const trip = await manager.getRepository(Trip).findOne({
        where: { id: tripId, teamId },
        lock: { mode: "pessimistic_write" },
      });
      if (!trip) throw new Error("Déplacement non trouvé");
      this.assertDraft(trip);
      const repository = manager.getRepository(TripParticipant);
      const participant = repository.create({
        tripId,
        ...data,
        consentStatus: "NOT_REQUIRED",
        consentRecordedBy: null,
        consentRecordedAt: null,
        consentNote: null,
      });
      return repository.save(participant);
    });
  }

  async toggleConfirmed(participantId: number, teamId: string): Promise<TripParticipant> {
    const ds = await getDataSource();
    return ds.transaction(async (manager) => {
      const participant = await manager.getRepository(TripParticipant).findOne({ where: { id: participantId } });
      if (!participant) throw new Error("Participant non trouvé");
      const trip = await manager.getRepository(Trip).findOne({
        where: { id: participant.tripId, teamId },
        lock: { mode: "pessimistic_write" },
      });
      if (!trip) throw new Error("Participant non trouvé");
      if (["DEPARTED", "COMPLETED", "CANCELLED"].includes(trip.workflowStatus)) {
        throw new Error("La présence ne peut plus être modifiée après le départ");
      }
      participant.confirmed = !participant.confirmed;
      return manager.getRepository(TripParticipant).save(participant);
    });
  }

  async removeParticipant(participantId: number, teamId: string): Promise<boolean> {
    const ds = await getDataSource();
    return ds.transaction(async (manager) => {
      const repository = manager.getRepository(TripParticipant);
      const participant = await repository.findOne({ where: { id: participantId } });
      if (!participant) throw new Error("Participant non trouvé");
      const trip = await manager.getRepository(Trip).findOne({
        where: { id: participant.tripId, teamId },
        lock: { mode: "pessimistic_write" },
      });
      if (!trip) throw new Error("Participant non trouvé");
      this.assertDraft(trip);
      await repository.remove(participant);
      return true;
    });
  }

  private assertDraft(trip: Trip): void {
    if (trip.workflowStatus !== "DRAFT") {
      throw new Error("La structure du déplacement est figée après soumission du budget");
    }
  }

  private async replaceVehicles(manager: EntityManager, tripId: number, vehicles: TripVehicleInput[]): Promise<TripVehicle[]> {
    const repository = manager.getRepository(TripVehicle);
    await repository.delete({ tripId });
    if (vehicles.length === 0) return [];
    const rows = vehicles.map((vehicle) =>
      repository.create({
        tripId,
        vehicleType: vehicle.vehicleType,
        label: vehicle.label ?? null,
        driverName: vehicle.driverName ?? null,
        seats: vehicle.seats,
      }),
    );
    return repository.save(rows);
  }
}

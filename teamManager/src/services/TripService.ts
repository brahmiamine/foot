import { getDataSource } from "@/lib/database";
import { Trip, TripMatchKind } from "@/entities/Trip";
import { TripVehicle } from "@/entities/TripVehicle";
import { TripParticipant, TripParticipantType, TripTransportOffer } from "@/entities/TripParticipant";
import { In, Repository } from "typeorm";
import { AgeCategory } from "@/types/categories";
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
    return repository.find({ where, relations: ["match", "match.homeTeam", "match.awayTeam", "friendlyMatch", "friendlyMatch.opponentTeam"], order: { departureTime: "ASC" } });
  }

  async findById(id: number, teamId: string): Promise<Trip | null> {
    const repository = await this.getRepository();
    return repository.findOne({ where: { id, teamId }, relations: ["match", "match.homeTeam", "match.awayTeam", "friendlyMatch", "friendlyMatch.opponentTeam"] });
  }

  async findVehicles(tripId: number): Promise<TripVehicle[]> {
    const repository = await this.getVehicleRepository();
    return repository.find({ where: { tripId }, order: { id: "ASC" } });
  }

  async saveVehicles(tripId: number, vehicles: TripVehicleInput[]): Promise<TripVehicle[]> {
    const repository = await this.getVehicleRepository();
    await repository.delete({ tripId });
    if (vehicles.length === 0) return [];
    const rows = vehicles.map((v) =>
      repository.create({ tripId, vehicleType: v.vehicleType, label: v.label ?? null, driverName: v.driverName ?? null, seats: v.seats })
    );
    return repository.save(rows);
  }

  async findParticipants(tripId: number): Promise<TripParticipant[]> {
    const repository = await this.getParticipantRepository();
    return repository.find({ where: { tripId }, relations: ["player"], order: { createdAt: "ASC" } });
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
    createdBy: string
  ): Promise<Trip> {
    const repository = await this.getRepository();
    const { vehicles, ...tripData } = data;
    const trip = repository.create({ ...tripData, teamId, createdBy });
    const saved = await repository.save(trip);
    if (vehicles && vehicles.length > 0) {
      await this.saveVehicles(saved.id, vehicles);
    }
    return saved;
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
    }>
  ): Promise<Trip> {
    const repository = await this.getRepository();
    const trip = await this.findById(id, teamId);
    if (!trip) {
      throw new Error("Déplacement non trouvé");
    }
    const { vehicles, ...tripData } = data;
    Object.assign(trip, tripData);
    const saved = await repository.save(trip);
    if (vehicles !== undefined) {
      await this.saveVehicles(id, vehicles);
    }
    return saved;
  }

  async delete(id: number, teamId: string): Promise<boolean> {
    const repository = await this.getRepository();
    const trip = await this.findById(id, teamId);
    if (!trip) {
      throw new Error("Déplacement non trouvé");
    }
    await repository.remove(trip);
    return true;
  }

  async addParticipant(
    tripId: number,
    data: {
      participantType: TripParticipantType;
      playerId?: string | null;
      name?: string | null;
      transportOffer: TripTransportOffer;
      offeredSeats?: number | null;
    }
  ): Promise<TripParticipant> {
    const repository = await this.getParticipantRepository();
    const participant = repository.create({ tripId, ...data });
    return repository.save(participant);
  }

  async toggleConfirmed(participantId: number): Promise<TripParticipant> {
    const repository = await this.getParticipantRepository();
    const participant = await repository.findOne({ where: { id: participantId } });
    if (!participant) {
      throw new Error("Participant non trouvé");
    }
    participant.confirmed = !participant.confirmed;
    return repository.save(participant);
  }

  async removeParticipant(participantId: number): Promise<boolean> {
    const repository = await this.getParticipantRepository();
    const participant = await repository.findOne({ where: { id: participantId } });
    if (!participant) {
      throw new Error("Participant non trouvé");
    }
    await repository.remove(participant);
    return true;
  }
}

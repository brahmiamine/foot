import { beforeEach, describe, expect, it, vi } from "vitest";
import { Trip } from "@/entities/Trip";
import { TripParticipant } from "@/entities/TripParticipant";

const participantFindOne = vi.fn();
const tripFindOne = vi.fn();
const participantSave = vi.fn();
const participantRemove = vi.fn();

const manager = {
  getRepository: (entity: unknown) => {
    if (entity === TripParticipant) {
      return {
        findOne: participantFindOne,
        save: participantSave,
        remove: participantRemove,
      };
    }
    if (entity === Trip) {
      return { findOne: tripFindOne };
    }
    throw new Error("unexpected entity");
  },
};

vi.mock("@/lib/database", () => ({
  getDataSource: async () => ({
    transaction: async <T>(callback: (entityManager: typeof manager) => Promise<T>) => callback(manager),
  }),
}));

beforeEach(() => {
  participantFindOne.mockReset();
  tripFindOne.mockReset();
  participantSave.mockReset();
  participantRemove.mockReset();
});

/**
 * TASK-P0-012 (todo.md): toggleConfirmed/removeParticipant used to trust
 * the numeric participant id alone, with no check that the underlying
 * trip belonged to the caller's team.
 */
describe("TripService cross-team guards", () => {
  it("toggleConfirmed refuses when the participant's trip belongs to another team", async () => {
    participantFindOne.mockResolvedValue({ id: 1, tripId: 10, confirmed: false });
    tripFindOne.mockResolvedValue(null);
    const { TripService } = await import("./TripService");
    const service = new TripService();

    await expect(service.toggleConfirmed(1, "team-attacker")).rejects.toThrow(
      "Participant non trouvé",
    );
    expect(participantSave).not.toHaveBeenCalled();
  });

  it("toggleConfirmed succeeds when the participant's trip belongs to the caller's team", async () => {
    const participant = { id: 1, tripId: 10, confirmed: false };
    participantFindOne.mockResolvedValue(participant);
    tripFindOne.mockResolvedValue({ id: 10, teamId: "team-owner", workflowStatus: "DRAFT" });
    participantSave.mockImplementation((entity) => Promise.resolve(entity));
    const { TripService } = await import("./TripService");
    const service = new TripService();

    const result = await service.toggleConfirmed(1, "team-owner");

    expect(result.confirmed).toBe(true);
    expect(participantSave).toHaveBeenCalledWith(participant);
  });

  it("removeParticipant refuses when the participant's trip belongs to another team", async () => {
    participantFindOne.mockResolvedValue({ id: 1, tripId: 10 });
    tripFindOne.mockResolvedValue(null);
    const { TripService } = await import("./TripService");
    const service = new TripService();

    await expect(service.removeParticipant(1, "team-attacker")).rejects.toThrow(
      "Participant non trouvé",
    );
    expect(participantRemove).not.toHaveBeenCalled();
  });
});

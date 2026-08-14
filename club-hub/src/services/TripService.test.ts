import { beforeEach, describe, expect, it, vi } from "vitest";
import { TripParticipant } from "@/entities/TripParticipant";

const findOne = vi.fn();
const save = vi.fn();
const remove = vi.fn();

vi.mock("@/lib/database", () => ({
  getDataSource: async () => ({
    getRepository: (entity: unknown) => {
      if (entity === TripParticipant) return { findOne, save, remove };
      throw new Error("unexpected entity");
    },
  }),
}));

beforeEach(() => {
  findOne.mockReset();
  save.mockReset();
  remove.mockReset();
});

/**
 * TASK-P0-012 (todo.md): toggleConfirmed/removeParticipant used to trust
 * the numeric participant id alone, with no check that the underlying
 * trip belonged to the caller's team.
 */
describe("TripService cross-team guards", () => {
  it("toggleConfirmed refuses when the participant's trip belongs to another team", async () => {
    findOne.mockResolvedValue({ id: 1, tripId: 10, trip: { id: 10, teamId: "team-victim" } });
    const { TripService } = await import("./TripService");
    const service = new TripService();

    await expect(service.toggleConfirmed(1, "team-attacker")).rejects.toThrow(
      "Participant non trouvé",
    );
    expect(save).not.toHaveBeenCalled();
  });

  it("toggleConfirmed succeeds when the participant's trip belongs to the caller's team", async () => {
    const participant = { id: 1, tripId: 10, trip: { id: 10, teamId: "team-owner" }, confirmed: false };
    findOne.mockResolvedValue(participant);
    save.mockImplementation((entity) => Promise.resolve(entity));
    const { TripService } = await import("./TripService");
    const service = new TripService();

    const result = await service.toggleConfirmed(1, "team-owner");

    expect(result.confirmed).toBe(true);
  });

  it("removeParticipant refuses when the participant's trip belongs to another team", async () => {
    findOne.mockResolvedValue({ id: 1, tripId: 10, trip: { id: 10, teamId: "team-victim" } });
    const { TripService } = await import("./TripService");
    const service = new TripService();

    await expect(service.removeParticipant(1, "team-attacker")).rejects.toThrow(
      "Participant non trouvé",
    );
    expect(remove).not.toHaveBeenCalled();
  });
});

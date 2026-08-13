import { beforeEach, describe, expect, it, vi } from "vitest";
import { TrainingInvitation } from "@/entities/TrainingInvitation";

const findOne = vi.fn();
const save = vi.fn();
const remove = vi.fn();

vi.mock("@/lib/database", () => ({
  getDataSource: async () => ({
    getRepository: (entity: unknown) => {
      if (entity === TrainingInvitation) return { findOne, save, remove, find: vi.fn() };
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
 * TASK-P0-012 (todo.md): updateResponse/remove used to trust the numeric
 * invitation id alone, with no check that the underlying training
 * belonged to the caller's team.
 */
describe("TrainingInvitationService cross-team guards", () => {
  it("updateResponse refuses when the invitation's training belongs to another team", async () => {
    findOne.mockResolvedValue({
      id: 1,
      trainingId: 10,
      training: { id: 10, teamId: "team-victim" },
    });
    const { TrainingInvitationService } = await import("./TrainingInvitationService");
    const service = new TrainingInvitationService();

    await expect(service.updateResponse(1, "team-attacker", "PRESENT")).rejects.toThrow(
      "Invitation non trouvée",
    );
    expect(save).not.toHaveBeenCalled();
  });

  it("updateResponse succeeds when the invitation's training belongs to the caller's team", async () => {
    const invitation = { id: 1, trainingId: 10, training: { id: 10, teamId: "team-owner" }, response: "PENDING" };
    findOne.mockResolvedValue(invitation);
    save.mockImplementation((entity) => Promise.resolve(entity));
    const { TrainingInvitationService } = await import("./TrainingInvitationService");
    const service = new TrainingInvitationService();

    const result = await service.updateResponse(1, "team-owner", "PRESENT");

    expect(result.response).toBe("PRESENT");
    expect(save).toHaveBeenCalled();
  });

  it("remove refuses when the invitation's training belongs to another team", async () => {
    findOne.mockResolvedValue({
      id: 1,
      trainingId: 10,
      training: { id: 10, teamId: "team-victim" },
    });
    const { TrainingInvitationService } = await import("./TrainingInvitationService");
    const service = new TrainingInvitationService();

    await expect(service.remove(1, "team-attacker")).rejects.toThrow("Invitation non trouvée");
    expect(remove).not.toHaveBeenCalled();
  });
});

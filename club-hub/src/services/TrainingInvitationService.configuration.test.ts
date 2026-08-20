import { beforeEach, describe, expect, it, vi } from "vitest";
import { Training } from "@/entities/Training";
import { TrainingInvitation } from "@/entities/TrainingInvitation";
import { Player } from "@/entities/Player";

const state = vi.hoisted(() => ({
  training: { id: 42, teamId: "team-1", category: "u15", status: "SCHEDULED", invitationsLocked: false },
  players: [] as Array<Record<string, unknown>>,
}));

const invitationFind = vi.fn();
const invitationSave = vi.fn();
const invitationRemove = vi.fn();
const playerFind = vi.fn();
const trainingFindOne = vi.fn();

vi.mock("@/adapters/identity/createClubIdentityAdapter", () => ({
  createClubIdentityAdapter: () => ({
    listUsers: vi.fn(async () => []),
  }),
}));
vi.mock("@/services/NotificationOutboxService", () => ({
  NotificationOutboxService: class { enqueue = vi.fn(); },
}));
vi.mock("@/lib/database", () => ({
  getDataSource: async () => ({
    transaction: async (work: (manager: unknown) => Promise<unknown>) => work({
      getRepository(entity: unknown) {
        if (entity === Training) return { findOne: trainingFindOne };
        if (entity === Player) return { find: playerFind };
        if (entity === TrainingInvitation) {
          return { find: invitationFind, save: invitationSave, remove: invitationRemove };
        }
        throw new Error("unexpected entity");
      },
    }),
  }),
}));

beforeEach(() => {
  state.training = { id: 42, teamId: "team-1", category: "u15", status: "SCHEDULED", invitationsLocked: false };
  state.players = [];
  invitationFind.mockReset().mockResolvedValue([]);
  invitationSave.mockReset().mockImplementation(async (value) => value);
  invitationRemove.mockReset();
  playerFind.mockReset().mockImplementation(async () => state.players);
  trainingFindOne.mockReset().mockImplementation(async () => state.training);
});

describe("TrainingInvitationService configurable roster", () => {
  it("blocks additions after the roster is locked", async () => {
    state.training.invitationsLocked = true;
    const { TrainingInvitationService } = await import("./TrainingInvitationService");
    await expect(new TrainingInvitationService().inviteBulk(42, "team-1", ["player-1"]))
      .rejects.toThrow("roster des invitations est verrouillé");
    expect(playerFind).not.toHaveBeenCalled();
    expect(invitationSave).not.toHaveBeenCalled();
  });

  it("fails closed when an invited player is not active in the club and category", async () => {
    const { TrainingInvitationService } = await import("./TrainingInvitationService");
    await expect(new TrainingInvitationService().inviteBulk(42, "team-1", ["player-other-team"]))
      .rejects.toThrow("pas éligibles pour cette séance");
    expect(invitationSave).not.toHaveBeenCalled();
  });
});

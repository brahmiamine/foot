import { describe, expect, it, vi } from "vitest";
import { Training } from "@/entities/Training";
import { TrainingInvitation } from "@/entities/TrainingInvitation";
import { PlayerEngagementService } from "./PlayerEngagementService";

function serviceWith(options: {
  invitation: Record<string, unknown>;
  training: Record<string, unknown>;
}) {
  const invitation = options.invitation;
  const invitationRepo = {
    findOne: vi.fn().mockResolvedValue(invitation),
    save: vi.fn(async (value) => value),
  };
  const trainingRepo = {
    findOne: vi.fn().mockResolvedValue(options.training),
  };
  const dataSource = {
    getRepository(entity: unknown) {
      if (entity === TrainingInvitation) return invitationRepo;
      if (entity === Training) return trainingRepo;
      throw new Error("unexpected entity");
    },
  };

  class TestService extends PlayerEngagementService {
    protected override async ds() {
      return dataSource as never;
    }
  }

  return { service: new TestService(), invitation, invitationRepo, trainingRepo };
}

describe("PlayerEngagementService training RSVP", () => {
  it("stores RSVP separately without overwriting staff attendance", async () => {
    const { service, invitation } = serviceWith({
      invitation: {
        id: 7,
        playerId: "player-1",
        trainingId: 42,
        response: "PENDING",
        rsvpStatus: "PENDING",
        rsvpRespondedAt: null,
      },
      training: {
        id: 42,
        status: "SCHEDULED",
        responseDeadline: new Date(Date.now() + 60_000),
      },
    });

    const result = await service.respondToTraining("player-1", 7, "ACCEPTED" as never);

    expect(result).toEqual({ success: true });
    expect(invitation.response).toBe("PENDING");
    expect(invitation.rsvpStatus).toBe("ACCEPTED");
    expect(invitation.rsvpRespondedAt).toBeInstanceOf(Date);
  });

  it("rejects RSVP once the configured response deadline has passed", async () => {
    const { service, invitationRepo } = serviceWith({
      invitation: {
        id: 8,
        playerId: "player-1",
        trainingId: 43,
        response: "PENDING",
        rsvpStatus: "PENDING",
        rsvpRespondedAt: null,
      },
      training: {
        id: 43,
        status: "SCHEDULED",
        responseDeadline: new Date(Date.now() - 60_000),
      },
    });

    const result = await service.respondToTraining("player-1", 8, "DECLINED" as never);

    expect(result).toEqual({ success: false, error: "response_deadline_passed" });
    expect(invitationRepo.save).not.toHaveBeenCalled();
  });
});

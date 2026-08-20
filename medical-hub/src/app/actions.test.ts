import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  permissions: new Set<string>(),
}));

const createInjury = vi.fn();
const updateInjury = vi.fn();
const transitionReturnToPlay = vi.fn();
const recordClearance = vi.fn();
const updateSettings = vi.fn();
const appendFollowUpNote = vi.fn();
const addDocument = vi.fn();

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth", () => ({
  auth: vi.fn(async () => ({ user: { id: "medical-user", teamId: "team-1" } })),
}));
vi.mock("@/lib/access", () => ({
  getUserAccess: vi.fn(async () => ({
    userId: "medical-user",
    teamId: "team-1",
    isClubAdmin: false,
    permissions: state.permissions,
    categories: "ALL",
  })),
  requirePermission: (_access: unknown, permission: string) => {
    if (!state.permissions.has(permission)) {
      throw new Error("Action non autorisée : permission manquante");
    }
  },
}));
vi.mock("@/services/MedicalPortalService", () => ({
  medicalPortalService: {
    createInjury,
    updateInjury,
    transitionReturnToPlay,
    recordClearance,
    updateSettings,
    appendFollowUpNote,
    addDocument,
  },
}));
vi.mock("@/lib/notificationApi", () => ({
  markNotificationRead: vi.fn(),
  markAllNotificationsRead: vi.fn(),
}));

beforeEach(() => {
  state.permissions = new Set();
  for (const mock of [
    createInjury,
    updateInjury,
    transitionReturnToPlay,
    recordClearance,
    updateSettings,
    appendFollowUpNote,
    addDocument,
  ]) mock.mockReset().mockResolvedValue(undefined);
});

describe("CLUB-013 least-privilege medical Server Actions", () => {
  it("lets a physiotherapist manage follow-up and RTP but not clearance or settings", async () => {
    state.permissions = new Set([
      "medical.view",
      "medical.followups.manage",
      "medical.rtp.manage",
    ]);
    const actions = await import("./actions");

    await actions.appendFollowUpNoteAction(7, "Travail de mobilité");
    await actions.transitionReturnToPlayAction(7, "INDIVIDUAL", "Reprise terrain");

    await expect(actions.recordClearanceAction(7, "CLEAR")).rejects.toThrow("permission manquante");
    await expect(actions.updateMedicalSettingsAction({
      clearanceRequired: true,
      severeSecondOpinionRequired: true,
    })).rejects.toThrow("permission manquante");

    expect(appendFollowUpNote).toHaveBeenCalledWith(7, "team-1", "Travail de mobilité", "medical-user");
    expect(transitionReturnToPlay).toHaveBeenCalledWith(7, "team-1", "INDIVIDUAL", "medical-user", "Reprise terrain");
    expect(recordClearance).not.toHaveBeenCalled();
    expect(updateSettings).not.toHaveBeenCalled();
  });

  it("lets a doctor diagnose and clear but not change club medical policy", async () => {
    state.permissions = new Set([
      "medical.view",
      "medical.injuries.manage",
      "medical.followups.manage",
      "medical.rtp.manage",
      "medical.clearance.manage",
      "medical.documents.manage",
    ]);
    const actions = await import("./actions");

    await actions.createInjuryAction({
      playerId: "player-1",
      injuryDate: "2026-08-20",
      zone: "cheville",
      severity: "MINOR",
      diagnosis: "entorse",
    });
    await actions.recordClearanceAction(7, "CLEAR", "apte");
    await actions.addDocumentAction(7, "compte-rendu.pdf", "/uploads/medical/report.pdf");

    await expect(actions.updateMedicalSettingsAction({
      clearanceRequired: false,
      severeSecondOpinionRequired: false,
    })).rejects.toThrow("permission manquante");

    expect(createInjury).toHaveBeenCalled();
    expect(recordClearance).toHaveBeenCalledWith(7, "team-1", "medical-user", "CLEAR", "apte");
    expect(addDocument).toHaveBeenCalledWith(7, "team-1", {
      name: "compte-rendu.pdf",
      url: "/uploads/medical/report.pdf",
    });
    expect(updateSettings).not.toHaveBeenCalled();
  });

  it("reserves medical settings to the medical manager capability", async () => {
    state.permissions = new Set(["medical.settings.manage"]);
    const { updateMedicalSettingsAction } = await import("./actions");

    await updateMedicalSettingsAction({
      clearanceRequired: true,
      severeSecondOpinionRequired: false,
    });

    expect(updateSettings).toHaveBeenCalledWith("team-1", "medical-user", {
      clearanceRequired: true,
      severeSecondOpinionRequired: false,
    });
  });
});

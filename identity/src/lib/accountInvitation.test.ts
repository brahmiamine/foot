import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DataSource } from "typeorm";
import { createTestDataSource } from "@/test/testDataSource";
import { AccountInvitation } from "@/entities/AccountInvitation";
import { User } from "@/entities/User";

let dataSource: DataSource;
const sendEmail = vi.fn();

vi.mock("@/lib/db", () => ({
  getDataSource: async () => dataSource,
}));
vi.mock("@/lib/mailer", () => ({
  sendEmail: (...args: unknown[]) => sendEmail(...args),
}));

beforeEach(async () => {
  dataSource = await createTestDataSource();
  sendEmail.mockReset();
  process.env.SSO_URL = "http://identity.test";
  process.env.ACCOUNT_INVITATION_TTL_HOURS = "48";
});

afterEach(async () => {
  await dataSource.destroy();
});

function tokenFromLastEmail(): string {
  const payload = sendEmail.mock.calls.at(-1)?.[0] as { html?: string } | undefined;
  const match = payload?.html?.match(/activate-account\?token=([^"<]+)/);
  if (!match) throw new Error("activation token missing from test email");
  return decodeURIComponent(match[1]);
}

describe("player account invitations", () => {
  it("creates an inactive PLAYER and activates it only after the invite is accepted", async () => {
    const { invitePlayerAccount, acceptAccountInvitation } = await import("./accountInvitation");

    const invitation = await invitePlayerAccount({
      name: "Ahmed Ben Ali",
      email: "Ahmed@example.com",
      teamId: "team-1",
      playerId: "player-1",
      invitedByUserId: "admin-1",
    });

    expect(invitation.email).toBe("ahmed@example.com");
    expect(sendEmail).toHaveBeenCalledTimes(1);

    const userBefore = await dataSource.getRepository(User).findOneByOrFail({ id: invitation.userId });
    expect(userBefore).toMatchObject({
      role: "PLAYER",
      teamId: "team-1",
      playerId: "player-1",
    });
    expect(Boolean(userBefore.isActive)).toBe(false);

    const token = tokenFromLastEmail();
    const accepted = await acceptAccountInvitation(token, "new-secret-123");
    expect(accepted).toMatchObject({ success: true, userId: invitation.userId, role: "PLAYER" });

    const userAfter = await dataSource.getRepository(User).findOneByOrFail({ id: invitation.userId });
    expect(Boolean(userAfter.isActive)).toBe(true);
    expect(userAfter.tokenVersion).toBe(1);

    const replay = await acceptAccountInvitation(token, "another-secret-123");
    expect(replay).toEqual({ success: false, error: "invalid_or_expired_invitation" });
  });

  it("invalidates any previous unused invite when the club reinvites the same player", async () => {
    const { invitePlayerAccount, acceptAccountInvitation } = await import("./accountInvitation");

    const first = await invitePlayerAccount({
      name: "Ahmed Ben Ali",
      email: "ahmed@example.com",
      teamId: "team-1",
      playerId: "player-1",
      invitedByUserId: "admin-1",
    });
    const firstToken = tokenFromLastEmail();

    const second = await invitePlayerAccount({
      name: "Ahmed Ben Ali",
      email: "ahmed@example.com",
      teamId: "team-1",
      playerId: "player-1",
      invitedByUserId: "admin-2",
    });
    const secondToken = tokenFromLastEmail();

    expect(second.userId).toBe(first.userId);
    expect(await acceptAccountInvitation(firstToken, "new-secret-123")).toEqual({
      success: false,
      error: "invalid_or_expired_invitation",
    });
    expect((await acceptAccountInvitation(secondToken, "new-secret-123")).success).toBe(true);

    const invites = await dataSource.getRepository(AccountInvitation).find({ where: { userId: first.userId } });
    expect(invites).toHaveLength(2);
    expect(invites.every((item) => item.usedAt instanceof Date)).toBe(true);
  });

  it("rejects an email already owned by another identity", async () => {
    const { invitePlayerAccount } = await import("./accountInvitation");
    const userRepo = dataSource.getRepository(User);
    await userRepo.save(
      userRepo.create({
        id: "other-user",
        name: "Other",
        email: "taken@example.com",
        password: "not-used",
        role: "OBSERVATEUR",
        isActive: true,
        teamId: "team-1",
        playerId: null,
        tokenVersion: 0,
      }),
    );

    await expect(
      invitePlayerAccount({
        name: "Ahmed Ben Ali",
        email: "taken@example.com",
        teamId: "team-1",
        playerId: "player-1",
      }),
    ).rejects.toMatchObject({ code: "EMAIL_TAKEN" });
  });

  it("does not issue a new activation link for an already active player account", async () => {
    const { invitePlayerAccount } = await import("./accountInvitation");
    await invitePlayerAccount({
      name: "Ahmed Ben Ali",
      email: "ahmed@example.com",
      teamId: "team-1",
      playerId: "player-1",
    });
    const { acceptAccountInvitation } = await import("./accountInvitation");
    await acceptAccountInvitation(tokenFromLastEmail(), "new-secret-123");

    await expect(
      invitePlayerAccount({
        name: "Ahmed Ben Ali",
        email: "ahmed@example.com",
        teamId: "team-1",
        playerId: "player-1",
      }),
    ).rejects.toMatchObject({ code: "PLAYER_ACCOUNT_ACTIVE" });
  });
});

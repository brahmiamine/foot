import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DataSource } from "typeorm";
import { createTestDataSource } from "@/test/testDataSource";
import { seedUser } from "@/test/fixtures";
import { PasswordResetToken } from "@/entities/PasswordResetToken";
import bcrypt from "bcryptjs";

let dataSource: DataSource;

vi.mock("@/lib/db", () => ({
  getDataSource: async () => dataSource,
}));

beforeEach(async () => {
  dataSource = await createTestDataSource();
});

afterEach(async () => {
  await dataSource.destroy();
  vi.unstubAllEnvs();
});

/** TS-34 — reset password. */
describe("requestPasswordReset", () => {
  it("creates a reset token for an existing active account", async () => {
    const { requestPasswordReset } = await import("./passwordReset");
    const user = await seedUser(dataSource, { email: "user@example.com" });

    await requestPasswordReset("user@example.com");

    const tokens = await dataSource.getRepository(PasswordResetToken).find({ where: { userId: user.id } });
    expect(tokens).toHaveLength(1);
    expect(tokens[0].usedAt).toBeNull();
  });

  it("does nothing for an unknown email (anti-enumeration)", async () => {
    const { requestPasswordReset } = await import("./passwordReset");

    await expect(requestPasswordReset("nobody@example.com")).resolves.toBeUndefined();

    expect(await dataSource.getRepository(PasswordResetToken).find()).toHaveLength(0);
  });

  it("does nothing for a deactivated account", async () => {
    const { requestPasswordReset } = await import("./passwordReset");
    await seedUser(dataSource, { email: "inactive@example.com", isActive: false });

    await requestPasswordReset("inactive@example.com");

    expect(await dataSource.getRepository(PasswordResetToken).find()).toHaveLength(0);
  });
});

describe("resetPassword", () => {
  async function seedToken(rawToken: string, overrides: Partial<PasswordResetToken> = {}) {
    const crypto = await import("crypto");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    const repo = dataSource.getRepository(PasswordResetToken);
    return repo.save(
      repo.create({
        userId: "user-1",
        tokenHash,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        ...overrides,
      }),
    );
  }

  it("rejects an unknown token", async () => {
    const { resetPassword } = await import("./passwordReset");

    const result = await resetPassword("does-not-exist", "new-password!");

    expect(result).toEqual({ success: false, error: "invalid_or_expired_token" });
  });

  it("rejects an expired token", async () => {
    const { resetPassword } = await import("./passwordReset");
    await seedUser(dataSource, { id: "user-1" });
    await seedToken("raw-token-1", { expiresAt: new Date(Date.now() - 1000) });

    const result = await resetPassword("raw-token-1", "new-password!");

    expect(result).toEqual({ success: false, error: "invalid_or_expired_token" });
  });

  it("rejects an already-used token", async () => {
    const { resetPassword } = await import("./passwordReset");
    await seedUser(dataSource, { id: "user-1" });
    await seedToken("raw-token-1", { usedAt: new Date() });

    const result = await resetPassword("raw-token-1", "new-password!");

    expect(result).toEqual({ success: false, error: "invalid_or_expired_token" });
  });

  it("marks the token as used after a successful reset (single use)", async () => {
    const { resetPassword } = await import("./passwordReset");
    await seedUser(dataSource, { id: "user-1" });
    await seedToken("raw-token-1");

    await resetPassword("raw-token-1", "new-password!");
    const second = await resetPassword("raw-token-1", "another-password!");

    expect(second).toEqual({ success: false, error: "invalid_or_expired_token" });
  });

  it("actually changes the stored password hash and increments tokenVersion", async () => {
    const { resetPassword } = await import("./passwordReset");
    const { User } = await import("@/entities/User");
    await seedUser(dataSource, { id: "user-1", tokenVersion: 3 });
    await seedToken("raw-token-1");

    await resetPassword("raw-token-1", "new-password!");

    const reloaded = await dataSource.getRepository(User).findOne({ where: { id: "user-1" } });
    expect(reloaded?.tokenVersion).toBe(4);
    expect(await bcrypt.compare("new-password!", reloaded!.password)).toBe(true);
  });
});

describe("changePassword", () => {
  it("changes the password and bumps tokenVersion when the current password is correct", async () => {
    const { changePassword } = await import("./passwordReset");
    await seedUser(dataSource, { id: "user-1", password: "old-password", tokenVersion: 5 });

    const result = await changePassword("user-1", "old-password", "new-password!");

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.user.tokenVersion).toBe(6);
      expect(await bcrypt.compare("new-password!", result.user.password)).toBe(true);
    }
  });

  it("rejects an incorrect current password", async () => {
    const { changePassword } = await import("./passwordReset");
    await seedUser(dataSource, { id: "user-1", password: "old-password" });

    const result = await changePassword("user-1", "wrong-password", "new-password!");

    expect(result).toEqual({ success: false, error: "invalid_current_password" });
  });

  it("rejects a deactivated account", async () => {
    const { changePassword } = await import("./passwordReset");
    await seedUser(dataSource, { id: "user-1", password: "old-password", isActive: false });

    const result = await changePassword("user-1", "old-password", "new-password!");

    expect(result).toEqual({ success: false, error: "account_inactive" });
  });
});

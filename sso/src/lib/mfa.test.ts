import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DataSource } from "typeorm";
import { createTestDataSource } from "@/test/testDataSource";
import { seedUser } from "@/test/fixtures";

let dataSource: DataSource;

vi.mock("@/lib/db", () => ({
  getDataSource: async () => dataSource,
}));

beforeEach(async () => {
  dataSource = await createTestDataSource();
});

afterEach(async () => {
  await dataSource.destroy();
});

/** TS-34 — MFA. */
describe("MFA enrollment challenge", () => {
  it("round-trips a pending secret until it is consumed", async () => {
    const { createMfaEnrollmentChallenge, getPendingMfaSecret, consumeMfaEnrollmentChallenge } = await import(
      "./mfa"
    );
    const user = await seedUser(dataSource);

    await createMfaEnrollmentChallenge(user.id, "SECRET123");
    expect(await getPendingMfaSecret(user.id)).toBe("SECRET123");

    await consumeMfaEnrollmentChallenge(user.id);
    expect(await getPendingMfaSecret(user.id)).toBeNull();
  });

  it("replaces a previous pending challenge for the same user", async () => {
    const { createMfaEnrollmentChallenge, getPendingMfaSecret } = await import("./mfa");
    const user = await seedUser(dataSource);

    await createMfaEnrollmentChallenge(user.id, "FIRST");
    await createMfaEnrollmentChallenge(user.id, "SECOND");

    expect(await getPendingMfaSecret(user.id)).toBe("SECOND");
  });

  it("returns null for an unknown user", async () => {
    const { getPendingMfaSecret } = await import("./mfa");

    expect(await getPendingMfaSecret("nobody")).toBeNull();
  });
});

describe("isMfaEnabled", () => {
  it("is false when mfaEnabled is false, even with a secret set", async () => {
    const { isMfaEnabled } = await import("./mfa");
    const user = await seedUser(dataSource, { mfaEnabled: false, mfaSecret: "SECRET" });

    expect(await isMfaEnabled(user.id)).toBe(false);
  });

  it("is false when mfaEnabled is true but no secret is stored", async () => {
    const { isMfaEnabled } = await import("./mfa");
    const user = await seedUser(dataSource, { mfaEnabled: true, mfaSecret: null });

    expect(await isMfaEnabled(user.id)).toBe(false);
  });

  it("is true when both mfaEnabled and mfaSecret are set", async () => {
    const { isMfaEnabled } = await import("./mfa");
    const user = await seedUser(dataSource, { mfaEnabled: true, mfaSecret: "SECRET" });

    expect(await isMfaEnabled(user.id)).toBe(true);
  });
});

describe("verifyTotpCode", () => {
  it("rejects a code that isn't exactly 6 digits, without calling otplib", async () => {
    const { verifyTotpCode } = await import("./mfa");

    expect(await verifyTotpCode("SECRET", "12345")).toBe(false);
    expect(await verifyTotpCode("SECRET", "abcdef")).toBe(false);
    expect(await verifyTotpCode("SECRET", "1234567")).toBe(false);
  });
});

describe("recovery codes", () => {
  it("generates 10 unique hex codes", async () => {
    const { generateRecoveryCodes } = await import("./mfa");

    const codes = generateRecoveryCodes();

    expect(codes).toHaveLength(10);
    expect(new Set(codes).size).toBe(10);
    for (const code of codes) expect(code).toMatch(/^[0-9a-f]{10}$/);
  });

  it("consumes a valid code exactly once and rejects it on replay", async () => {
    const { generateRecoveryCodes, hashRecoveryCodes, consumeRecoveryCode } = await import("./mfa");
    const codes = generateRecoveryCodes();
    const stored = await hashRecoveryCodes(codes);

    const first = await consumeRecoveryCode(stored, codes[0]);
    expect(first.valid).toBe(true);
    expect(first.remaining).not.toBe(stored);

    const replay = await consumeRecoveryCode(first.remaining, codes[0]);
    expect(replay.valid).toBe(false);
  });

  it("rejects an unknown code without mutating the stored list", async () => {
    const { generateRecoveryCodes, hashRecoveryCodes, consumeRecoveryCode } = await import("./mfa");
    const codes = generateRecoveryCodes();
    const stored = await hashRecoveryCodes(codes);

    const result = await consumeRecoveryCode(stored, "not-a-real-code");

    expect(result.valid).toBe(false);
    expect(result.remaining).toBe(stored);
  });

  it("rejects any code when nothing is stored", async () => {
    const { consumeRecoveryCode } = await import("./mfa");

    const result = await consumeRecoveryCode(null, "anything");

    expect(result.valid).toBe(false);
  });
});

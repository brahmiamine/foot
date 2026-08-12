import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SignJWT } from "jose";
import {
  getSsoRevocationFailureMode,
  verifySsoTokenWithRevocation,
} from "../../../packages/auth-shared/src/session";

/**
 * TS-29 — exécuté via le harnais vitest de `billetterie` (une des 6 apps
 * qui importent packages/auth-shared par chemin relatif, voir README.md de
 * ce dossier : le package lui-même n'a pas son propre node_modules/jose).
 */
describe("getSsoRevocationFailureMode (TS-29)", () => {
  const originalMode = process.env.SSO_REVOCATION_FAILURE_MODE;

  afterEach(() => {
    if (originalMode === undefined) delete process.env.SSO_REVOCATION_FAILURE_MODE;
    else process.env.SSO_REVOCATION_FAILURE_MODE = originalMode;
  });

  it('defaults to "open" when unset', () => {
    delete process.env.SSO_REVOCATION_FAILURE_MODE;
    expect(getSsoRevocationFailureMode()).toBe("open");
  });

  it('defaults to "open" for any value other than "closed"', () => {
    process.env.SSO_REVOCATION_FAILURE_MODE = "strict";
    expect(getSsoRevocationFailureMode()).toBe("open");
  });

  it('returns "closed" when explicitly configured', () => {
    process.env.SSO_REVOCATION_FAILURE_MODE = "closed";
    expect(getSsoRevocationFailureMode()).toBe("closed");
  });
});

describe("verifySsoTokenWithRevocation — unconfirmed revocation (TS-29)", () => {
  const originalMode = process.env.SSO_REVOCATION_FAILURE_MODE;
  const originalSecret = process.env.SSO_JWT_SECRET;
  const originalSsoUrl = process.env.SSO_URL;

  beforeEach(() => {
    process.env.SSO_JWT_SECRET = "test-secret-at-least-32-bytes-long!!";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    if (originalMode === undefined) delete process.env.SSO_REVOCATION_FAILURE_MODE;
    else process.env.SSO_REVOCATION_FAILURE_MODE = originalMode;
    if (originalSecret === undefined) delete process.env.SSO_JWT_SECRET;
    else process.env.SSO_JWT_SECRET = originalSecret;
    if (originalSsoUrl === undefined) delete process.env.SSO_URL;
    else process.env.SSO_URL = originalSsoUrl;
  });

  // `nonce` garantit un JWT unique par appel (donc une clé de cache de
  // révocation distincte) même si deux tests signent dans la même seconde
  // avec un payload par ailleurs identique — la révocation est mise en
  // cache par valeur brute du jeton, voir revocationCache dans session.ts.
  async function signToken(): Promise<string> {
    return new SignJWT({
      email: "user@example.com",
      name: "User",
      role: "ADMIN",
      teamId: null,
      nonce: crypto.randomUUID(),
    })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject("user-1")
      .setIssuer("foot-sso")
      .setIssuedAt()
      .setExpirationTime("12h")
      .sign(new TextEncoder().encode(process.env.SSO_JWT_SECRET));
  }

  it('falls back to the cryptographic result when SSO_URL is unset and mode is "open"', async () => {
    delete process.env.SSO_URL;
    process.env.SSO_REVOCATION_FAILURE_MODE = "open";
    const token = await signToken();

    const result = await verifySsoTokenWithRevocation(token);

    expect(result?.id).toBe("user-1");
  });

  it('rejects the session when SSO_URL is unset and mode is "closed"', async () => {
    delete process.env.SSO_URL;
    process.env.SSO_REVOCATION_FAILURE_MODE = "closed";
    const token = await signToken();

    const result = await verifySsoTokenWithRevocation(token);

    expect(result).toBeNull();
  });

  it('rejects the session when the introspection call throws and mode is "closed"', async () => {
    process.env.SSO_URL = "http://sso.invalid";
    process.env.SSO_REVOCATION_FAILURE_MODE = "closed";
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));
    const token = await signToken();

    const result = await verifySsoTokenWithRevocation(token);

    expect(result).toBeNull();
  });

  it('keeps the cryptographic result when the introspection call throws and mode is "open"', async () => {
    process.env.SSO_URL = "http://sso.invalid";
    process.env.SSO_REVOCATION_FAILURE_MODE = "open";
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));
    const token = await signToken();

    const result = await verifySsoTokenWithRevocation(token);

    expect(result?.id).toBe("user-1");
  });

  it("still honors a confirmed revocation (active: false) regardless of the failure mode", async () => {
    process.env.SSO_URL = "http://sso.invalid";
    process.env.SSO_REVOCATION_FAILURE_MODE = "open";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ active: false }),
      }),
    );
    const token = await signToken();

    const result = await verifySsoTokenWithRevocation(token);

    expect(result).toBeNull();
  });
});

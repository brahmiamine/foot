import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { SignJWT } from "jose";
import {
  SSO_JWT_AUDIENCE,
  verifySsoToken,
} from "../../../packages/auth-shared/src/session";

/**
 * TS-28 — exécuté via le harnais vitest de `ticketing` (une des 6 apps
 * qui importent packages/auth-shared par chemin relatif, voir README.md de
 * ce dossier : le package lui-même n'a pas son propre node_modules/jose).
 */
describe("verifySsoToken — audience (TS-28)", () => {
  const originalSecret = process.env.SSO_JWT_SECRET;

  beforeEach(() => {
    process.env.SSO_JWT_SECRET = "test-secret-at-least-32-bytes-long!!";
  });

  afterEach(() => {
    if (originalSecret === undefined) delete process.env.SSO_JWT_SECRET;
    else process.env.SSO_JWT_SECRET = originalSecret;
  });

  async function signToken(audience?: string | string[]): Promise<string> {
    const jwt = new SignJWT({ email: "user@example.com", name: "User", role: "ADMIN", teamId: null })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject("user-1")
      .setIssuer("foot-sso")
      .setIssuedAt()
      .setExpirationTime("12h");
    if (audience !== undefined) jwt.setAudience(audience);
    return jwt.sign(new TextEncoder().encode(process.env.SSO_JWT_SECRET));
  }

  it("accepts a token signed with the expected audience", async () => {
    const token = await signToken(SSO_JWT_AUDIENCE);

    const result = await verifySsoToken(token);

    expect(result?.id).toBe("user-1");
  });

  it("accepts a token predating the aud claim (transitional, no aud at all)", async () => {
    const token = await signToken();

    const result = await verifySsoToken(token);

    expect(result?.id).toBe("user-1");
  });

  it("rejects a token signed with a different audience", async () => {
    const token = await signToken("some-other-app");

    const result = await verifySsoToken(token);

    expect(result).toBeNull();
  });

  it("accepts a token whose audience array includes the expected value", async () => {
    const token = await signToken(["some-other-app", SSO_JWT_AUDIENCE]);

    const result = await verifySsoToken(token);

    expect(result?.id).toBe("user-1");
  });
});

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const dictionary = fs.readFileSync(new URL("../src/i18n/dictionaries.ts", import.meta.url), "utf8");
const read = (file) => fs.readFileSync(new URL(`../src/components/${file}`, import.meta.url), "utf8");

const journeys = {
  connexion: ["LoginForm.tsx", ["auth.login.submit", "auth.clubSelection.select", "auth.mfa.code.label"]],
  "mot de passe oublié": ["ForgotPasswordForm.tsx", ["auth.password.forgotSend", "auth.password.forgotSuccess"]],
  MFA: ["MfaSetupForm.tsx", ["auth.mfa.scan", "auth.mfa.recovery", "auth.mfa.disable"]],
  "événements de sécurité": ["SecurityEventsTable.tsx", ["account.securityEvents.allTypes", "account.securityEvents.results", "ar-TN"]],
};

for (const [journey, [component, keys]] of Object.entries(journeys)) {
  test(`${journey} utilise le catalogue arabe`, () => {
    const source = read(component);
    for (const key of keys) {
      assert.ok(source.includes(key), `${component} doit utiliser ${key}`);
      if (key !== "ar-TN") {
        const occurrence = dictionary.match(new RegExp(`"${key.replaceAll(".", "\\.")}"`, "g")) ?? [];
        assert.equal(occurrence.length, 2, `${key} doit avoir une valeur française et arabe`);
      }
    }
  });
}

test("les formulaires traduisent les codes d’erreur stables des endpoints", () => {
  const apiErrors = fs.readFileSync(new URL("../src/i18n/apiErrors.ts", import.meta.url), "utf8");
  for (const code of ["INVALID_CREDENTIALS", "EMAIL_REQUIRED", "MFA_CODE_INVALID", "RATE_LIMITED"]) {
    assert.ok(apiErrors.includes(code));
  }
  for (const component of ["LoginForm.tsx", "ForgotPasswordForm.tsx", "MfaSetupForm.tsx"]) {
    assert.ok(read(component).includes("apiErrorKey"));
  }
});

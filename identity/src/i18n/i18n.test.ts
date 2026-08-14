import assert from "node:assert/strict";
import { test } from "node:test";
import { ar } from "./ar";
import { fr } from "./fr";
import { translate } from "./index";
test("French and Arabic catalogs have identical keys", () => assert.deepEqual(Object.keys(ar).sort(), Object.keys(fr).sort()));
test("named values are interpolated", () => assert.equal(translate("fr", "auth.login.title", { name: "Amal" }), "Connexion"));
test("missing Arabic values fall back to French", () => {
  const old = ar["common.save"]; delete (ar as Partial<typeof ar>)["common.save"];
  assert.equal(translate("ar", "common.save"), fr["common.save"]); ar["common.save"] = old;
});

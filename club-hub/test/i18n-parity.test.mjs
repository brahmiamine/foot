import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";

test("les catalogues français et arabe sont en parité", () => {
  const app = path.basename(process.cwd());
  const audit = path.resolve(process.cwd(), "../scripts/i18n-audit.mjs");
  const result = spawnSync(process.execPath, [audit, "--project", app], { encoding: "utf8" });
  assert.equal(result.status, 0, `${result.stdout}${result.stderr}`);
});

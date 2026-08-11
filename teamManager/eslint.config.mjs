import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // public/js/* est du JS vendored (bootstrap.min.js, ScrollTrigger.min.js,
    // wow.min.js, validator.min.js...), jamais écrit par ce projet — inutile
    // à linter, et ça noyait les vraies erreurs sous ~1600 avertissements
    // (voir avancement.md, rang 6).
    "public/**",
  ]),
]);

export default eslintConfig;

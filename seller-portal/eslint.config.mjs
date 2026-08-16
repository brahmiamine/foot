import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    rules: {
      // Regles "React Compiler" d'eslint-plugin-react-hooks v7 (embarquees
      // par eslint-config-next 16), passees en avertissement : ce sont de
      // nouvelles heuristiques statiques (distinctes de la regle historique
      // rules-of-hooks) qui remontent des motifs deja presents dans le code
      // existant. Les traiter au cas par cas est un chantier separe de la
      // normalisation du workspace pnpm — voir README racine, section
      // "Installation du workspace pnpm".
      "react-hooks/config": "warn",
      "react-hooks/error-boundaries": "warn",
      "react-hooks/gating": "warn",
      "react-hooks/globals": "warn",
      "react-hooks/immutability": "warn",
      "react-hooks/preserve-manual-memoization": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/refs": "warn",
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/set-state-in-render": "warn",
      "react-hooks/static-components": "warn",
      "react-hooks/use-memo": "warn",
    },
  },
]);

export default eslintConfig;

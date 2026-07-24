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
    // Tooling de agentes (skills instaladas y worktrees de Claude Code) — no
    // es código de la app y no debe lintarse.
    ".agents/**",
    ".claude/**",
    ".github/skills/**",
  ]),
]);

export default eslintConfig;

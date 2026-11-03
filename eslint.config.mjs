import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([".next/**", ".next-auth-local/**", ".next-practice-local/**", ".next-practice-test/**", ".next-hosted-check/**", ".next-match-local/**", ".next-match-test/**", "coverage/**", "playwright-report/**", "test-results/**", "next-env.d.ts", "src/types/database.generated.ts"]),
]);

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? sourceFiles(path) : [path];
  });
}

describe("question confidentiality", () => {
  it("keeps the trusted catalog outside application imports and sources", () => {
    for (const path of sourceFiles("src")) {
      const content = readFileSync(path, "utf8");
      expect(content, path).not.toMatch(/supabase\/(questions|seed)|catalog\.json|corrected_code_snapshot|explanation_snapshot/);
    }
  });
  it("exposes only the public schema through the local Data API", () => {
    const config = readFileSync("supabase/config.toml", "utf8");
    expect(config).toMatch(/^schemas = \["public"\]$/m);
    expect(config).toMatch(/^auto_expose_new_tables = false$/m);
  });
});

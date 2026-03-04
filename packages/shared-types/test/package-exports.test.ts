import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("@voice-hub/shared-types package exports", () => {
  it("uses relative subpath exports for memory module", () => {
    const packageJsonPath = join(import.meta.dirname, "..", "package.json");
    const pkg = JSON.parse(readFileSync(packageJsonPath, "utf8")) as {
      exports?: Record<string, unknown>;
    };

    expect(pkg.exports).toBeDefined();
    expect(pkg.exports?.["./memory"]).toBeDefined();
    expect(pkg.exports?.["/memory"]).toBeUndefined();
  });
});

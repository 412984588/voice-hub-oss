import { describe, expect, it } from "vitest";
import {
  scanText,
  shouldScanFileName,
} from "../../../scripts/secret-scan-core.js";

describe("secret-scan-core", () => {
  it("detects discord-like tokens with line metadata", () => {
    const tokenValue = `${"A".repeat(24)}.${"B".repeat(6)}.${"C".repeat(27)}`;
    const token = `const t = "${tokenValue}";`;
    const issues = scanText(token);

    expect(issues.length).toBeGreaterThan(0);
    expect(issues[0]).toMatchObject({
      pattern: "Discord Bot Token",
      line: 1,
    });
  });

  it("supports .env.example files in scan list", () => {
    expect(shouldScanFileName(".env.example")).toBe(true);
    expect(shouldScanFileName(".env")).toBe(true);
    expect(shouldScanFileName("index.ts")).toBe(true);
    expect(shouldScanFileName("logo.png")).toBe(false);
  });

  it("only excludes real test-like filenames", () => {
    expect(shouldScanFileName("auth.todo.ts")).toBe(true);
    expect(shouldScanFileName("service.todo.test.ts")).toBe(false);
    expect(shouldScanFileName("user.spec.ts")).toBe(false);
    expect(shouldScanFileName("api.test.ts")).toBe(false);
  });

  it("finds JWT-like payload safely", () => {
    const jwtHeader = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9";
    const jwtBody = "abc123";
    const jwtSig = "def456";
    const content = `jwt = "${[jwtHeader, jwtBody, jwtSig].join(".")}"\nend = true`;
    const issues = scanText(content);

    expect(issues.some((issue) => issue.pattern === "JWT")).toBe(true);
  });
});

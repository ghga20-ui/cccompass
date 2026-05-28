import { describe, expect, it } from "vitest";
import { createShareToken } from "@/lib/tokens";

describe("createShareToken", () => {
  it("returns a URL-safe token", () => {
    expect(createShareToken()).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("returns a token at least 32 characters long", () => {
    expect(createShareToken().length).toBeGreaterThanOrEqual(32);
  });

  it("returns different tokens across repeated calls", () => {
    expect(createShareToken()).not.toBe(createShareToken());
  });
});

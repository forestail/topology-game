import { describe, expect, it } from "vitest";
import { MAX_SEED_LENGTH, parseSeedInput } from "./seedInput";

describe("parseSeedInput", () => {
  it("trims a valid shared seed", () => {
    expect(parseSeedInput("  abc123-shared  ")).toEqual({
      valid: true,
      seed: "abc123-shared",
    });
  });

  it("rejects an empty seed", () => {
    expect(parseSeedInput("   ").valid).toBe(false);
  });

  it("rejects control characters", () => {
    expect(parseSeedInput("seed\nvalue").valid).toBe(false);
  });

  it("rejects seeds over the supported length", () => {
    expect(parseSeedInput("x".repeat(MAX_SEED_LENGTH + 1)).valid).toBe(false);
  });
});

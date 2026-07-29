import { describe, expect, it } from "vitest";
import {
  chooseCpuMove,
  evaluateCpuMoves,
  evaluateHardCpuMoves,
} from "./cpu";
import type { GameNode } from "./types";

function node(
  id: string,
  type: GameNode["type"],
  owner: GameNode["owner"] = null,
): GameNode {
  return { id, x: 0, y: 0, type, owner };
}

describe("CPU", () => {
  it("never chooses an owned node", () => {
    const nodes = [
      node("owned-player", "hub", "player"),
      node("owned-cpu", "hub", "cpu"),
      node("open", "normal"),
    ];
    expect(chooseCpuMove(nodes, [], () => 0)).toBe("open");
  });

  it("prioritizes the higher evaluated node", () => {
    const nodes = [node("normal", "normal"), node("hub", "hub")];
    const evaluations = evaluateCpuMoves(nodes, []);
    const hub = evaluations.find((item) => item.nodeId === "hub");
    const normal = evaluations.find((item) => item.nodeId === "normal");

    expect(hub?.value).toBeGreaterThan(normal?.value ?? 0);
    expect(chooseCpuMove(nodes, [], () => 0.5)).toBe("hub");
  });

  it("lets Easy vary among several strong candidates", () => {
    const nodes = [node("normal", "normal"), node("hub", "hub")];
    expect(chooseCpuMove(nodes, [], () => 0.99, "easy")).toBe("normal");
  });

  it("lets Hard account for the player's strongest reply", () => {
    const nodes = [node("normal", "normal"), node("hub", "hub")];
    const evaluations = evaluateHardCpuMoves(nodes, []);
    const hub = evaluations.find((item) => item.nodeId === "hub");
    const normal = evaluations.find((item) => item.nodeId === "normal");

    expect(hub?.value).toBeGreaterThan(normal?.value ?? 0);
    expect(chooseCpuMove(nodes, [], () => 0.5, "hard")).toBe("hub");
  });

  it("never chooses an owned node at any difficulty", () => {
    const nodes = [
      node("owned", "hub", "player"),
      node("open-a", "normal"),
      node("open-b", "relay"),
    ];

    for (const difficulty of ["easy", "standard", "hard"] as const) {
      expect(
        chooseCpuMove(nodes, [], () => 0, difficulty),
      ).not.toBe("owned");
    }
  });
});

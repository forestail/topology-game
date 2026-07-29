import { describe, expect, it } from "vitest";
import { chooseCpuMove, evaluateCpuMoves } from "./cpu";
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
});

import { describe, expect, it } from "vitest";
import { calculateScore } from "./scoring";
import type { GameEdge, GameNode } from "./types";

function node(
  id: string,
  type: GameNode["type"],
  owner: GameNode["owner"],
): GameNode {
  return { id, x: 0, y: 0, type, owner };
}

function edge(sourceId: string, targetId: string): GameEdge {
  return { id: `${sourceId}-${targetId}`, sourceId, targetId };
}

describe("calculateScore", () => {
  it("calculates base points", () => {
    const score = calculateScore(
      [node("a", "normal", "player"), node("b", "hub", "cpu")],
      [],
    );
    expect(score.player.base).toBe(1);
    expect(score.cpu.base).toBe(2);
  });

  it("awards one point for a same-owner connection", () => {
    const score = calculateScore(
      [node("a", "normal", "player"), node("b", "normal", "player")],
      [edge("a", "b")],
    );
    expect(score.player.connections).toBe(1);
  });

  it("awards two points when a relay is on the connection", () => {
    const score = calculateScore(
      [node("a", "relay", "player"), node("b", "normal", "player")],
      [edge("a", "b")],
    );
    expect(score.player.connections).toBe(2);
  });

  it("counts a hub as two influence", () => {
    const score = calculateScore(
      [
        node("hub", "hub", "player"),
        node("target", "normal", null),
        node("cpu", "normal", "cpu"),
      ],
      [edge("hub", "target"), edge("cpu", "target")],
    );
    expect(score.player.influence).toBe(1);
    expect(score.cpu.influence).toBe(0);
  });

  it("awards no influence point on a tie", () => {
    const score = calculateScore(
      [
        node("player", "normal", "player"),
        node("target", "normal", null),
        node("cpu", "normal", "cpu"),
      ],
      [edge("player", "target"), edge("cpu", "target")],
    );
    expect(score.player.influence).toBe(0);
    expect(score.cpu.influence).toBe(0);
  });
});

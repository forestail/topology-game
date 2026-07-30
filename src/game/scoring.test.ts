import { describe, expect, it } from "vitest";
import {
  calculateScore,
  getLongestRoute,
  getScoreEvidence,
} from "./scoring";
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

  it("identifies the nodes behind base points", () => {
    const nodes = [
      node("hub", "hub", "player"),
      node("normal", "normal", "player"),
      node("cpu", "normal", "cpu"),
    ];
    const evidence = getScoreEvidence(nodes, [], "player", "base");

    expect(evidence.points).toBe(3);
    expect(evidence.itemCount).toBe(2);
    expect(evidence.nodeIds).toEqual(["hub", "normal"]);
  });

  it("identifies scoring connections and Relay value", () => {
    const nodes = [
      node("relay", "relay", "player"),
      node("normal", "normal", "player"),
      node("cpu", "normal", "cpu"),
    ];
    const edges = [edge("relay", "normal"), edge("normal", "cpu")];
    const evidence = getScoreEvidence(
      nodes,
      edges,
      "player",
      "connections",
    );

    expect(evidence.points).toBe(2);
    expect(evidence.itemCount).toBe(1);
    expect(evidence.edgeIds).toEqual(["relay-normal"]);
    expect(evidence.nodeIds).toEqual(["relay", "normal"]);
  });

  it("identifies influence targets, contributors, and their links", () => {
    const nodes = [
      node("hub", "hub", "player"),
      node("target", "normal", null),
      node("cpu", "normal", "cpu"),
    ];
    const edges = [edge("hub", "target"), edge("cpu", "target")];
    const evidence = getScoreEvidence(
      nodes,
      edges,
      "player",
      "influence",
    );

    expect(evidence.points).toBe(1);
    expect(evidence.targetNodeIds).toEqual(["target"]);
    expect(evidence.contributorNodeIds).toEqual(["hub"]);
    expect(evidence.edgeIds).toEqual(["hub-target"]);
  });

  it("scores only the single longest route", () => {
    const nodes = [
      ...["a", "b", "c", "d", "e", "f"].map((id) =>
        node(id, "normal", "player"),
      ),
      ...["x", "y", "z", "w"].map((id) =>
        node(id, "normal", "player"),
      ),
    ];
    const edges = [
      edge("a", "b"),
      edge("b", "c"),
      edge("c", "d"),
      edge("d", "e"),
      edge("e", "f"),
      edge("x", "y"),
      edge("y", "z"),
      edge("z", "w"),
    ];

    const route = getLongestRoute(nodes, edges, "player");
    const score = calculateScore(nodes, edges);

    expect(route.distance).toBe(5);
    expect(route.nodeIds).toEqual(["a", "b", "c", "d", "e", "f"]);
    expect(route.edgeIds).toEqual(["a-b", "b-c", "c-d", "d-e", "e-f"]);
    expect(score.player.route).toBe(2);
  });

  it("does not reuse a node when finding a route through a cycle", () => {
    const nodes = ["a", "b", "c", "d"].map((id) =>
      node(id, "normal", "cpu"),
    );
    const edges = [
      edge("a", "b"),
      edge("b", "c"),
      edge("c", "d"),
      edge("d", "a"),
    ];

    const route = getLongestRoute(nodes, edges, "cpu");

    expect(route.distance).toBe(3);
    expect(new Set(route.nodeIds).size).toBe(4);
    expect(route.points).toBe(1);
  });

  it("caps the longest-route bonus at five points", () => {
    const nodes = Array.from({ length: 12 }, (_, index) =>
      node(`n${index}`, "normal", "player"),
    );
    const edges = Array.from({ length: 11 }, (_, index) =>
      edge(`n${index}`, `n${index + 1}`),
    );

    expect(getLongestRoute(nodes, edges, "player").distance).toBe(11);
    expect(calculateScore(nodes, edges).player.route).toBe(5);
  });

  it("highlights only the route used for the bonus", () => {
    const nodes = ["a", "b", "c", "d", "x", "y", "z"].map((id) =>
      node(id, "normal", "player"),
    );
    const edges = [
      edge("a", "b"),
      edge("b", "c"),
      edge("c", "d"),
      edge("x", "y"),
      edge("y", "z"),
    ];
    const evidence = getScoreEvidence(nodes, edges, "player", "route");

    expect(evidence.points).toBe(1);
    expect(evidence.itemCount).toBe(3);
    expect(evidence.nodeIds).toEqual(["a", "b", "c", "d"]);
    expect(evidence.edgeIds).toEqual(["a-b", "b-c", "c-d"]);
  });
});

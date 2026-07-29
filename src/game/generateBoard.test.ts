import { describe, expect, it } from "vitest";
import { MAX_DEGREE, NODE_COUNT } from "./constants";
import { generateBoard } from "./generateBoard";

describe("generateBoard", () => {
  it("reproduces the same board from the same seed", () => {
    expect(generateBoard("repeatable-seed")).toEqual(
      generateBoard("repeatable-seed"),
    );
  });

  it("creates different boards from different seeds", () => {
    expect(generateBoard("alpha").nodes).not.toEqual(generateBoard("beta").nodes);
  });

  it("creates the requested number of nodes with at least one edge each", () => {
    const board = generateBoard("connected-board");
    const degree = new Map(board.nodes.map((node) => [node.id, 0]));

    for (const edge of board.edges) {
      degree.set(edge.sourceId, (degree.get(edge.sourceId) ?? 0) + 1);
      degree.set(edge.targetId, (degree.get(edge.targetId) ?? 0) + 1);
    }

    expect(board.nodes).toHaveLength(NODE_COUNT);
    expect([...degree.values()].every((value) => value >= 1)).toBe(true);
  });

  it("keeps every node within the degree limit", () => {
    for (const seed of ["degree-a", "degree-b", "degree-c", "degree-d"]) {
      const board = generateBoard(seed);
      const degree = new Map(board.nodes.map((node) => [node.id, 0]));
      for (const edge of board.edges) {
        degree.set(edge.sourceId, (degree.get(edge.sourceId) ?? 0) + 1);
        degree.set(edge.targetId, (degree.get(edge.targetId) ?? 0) + 1);
      }
      expect(Math.max(...degree.values())).toBeLessThanOrEqual(MAX_DEGREE);
    }
  });

  it("produces one connected graph", () => {
    for (let seedIndex = 0; seedIndex < 64; seedIndex += 1) {
      const board = generateBoard(`connectivity-${seedIndex}`);
      const seen = new Set<string>([board.nodes[0].id]);
      const queue = [board.nodes[0].id];

      while (queue.length > 0) {
        const current = queue.shift();
        for (const edge of board.edges) {
          const neighbor =
            edge.sourceId === current
              ? edge.targetId
              : edge.targetId === current
                ? edge.sourceId
                : null;
          if (neighbor && !seen.has(neighbor)) {
            seen.add(neighbor);
            queue.push(neighbor);
          }
        }
      }

      expect(seen.size).toBe(NODE_COUNT);
    }
  });
});

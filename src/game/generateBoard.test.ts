import { describe, expect, it } from "vitest";
import {
  HUB_COUNT,
  MAX_DEGREE,
  MIN_NODE_DISTANCE,
  NODE_COUNT,
  RELAY_COUNT,
} from "./constants";
import { analyzeTopology, generateBoard } from "./generateBoard";
import type { GeneratedBoard } from "./generateBoard";
import type { TerrainType } from "./types";

const TERRAINS: TerrainType[] = [
  "archipelago",
  "hourglass",
  "ring",
  "spine",
  "core",
  "twin",
  "delta",
  "ladder",
  "crossroads",
  "fortress",
  "river",
  "trident",
  "constellation",
  "crescent",
  "basin",
];

const EXPECTED_PROFILE = {
  archipelago: { edges: 32, bridges: 2 },
  hourglass: { edges: 31, bridges: 2 },
  ring: { edges: 35, bridges: 0 },
  spine: { edges: 30, bridges: 5 },
  core: { edges: 33, bridges: 3 },
  twin: { edges: 34, bridges: 1 },
  delta: { edges: 30, bridges: 3 },
  ladder: { edges: 34, bridges: 0 },
  crossroads: { edges: 31, bridges: 4 },
  fortress: { edges: 36, bridges: 0 },
  river: { edges: 32, bridges: 0 },
  trident: { edges: 28, bridges: 3 },
  constellation: { edges: 31, bridges: 5 },
  crescent: { edges: 30, bridges: 0 },
  basin: { edges: 35, bridges: 0 },
} satisfies Record<TerrainType, { edges: number; bridges: number }>;

function isConnected(board: GeneratedBoard): boolean {
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
  return seen.size === NODE_COUNT;
}

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
    for (let seedIndex = 0; seedIndex < 128; seedIndex += 1) {
      const board = generateBoard(`connectivity-${seedIndex}`);
      expect(isConnected(board)).toBe(true);
    }
  });

  it("uses all fifteen terrain families across seeds", () => {
    const terrains = new Set<TerrainType>();
    for (let seedIndex = 0; seedIndex < 300; seedIndex += 1) {
      terrains.add(generateBoard(`terrain-sample-${seedIndex}`).terrain);
    }
    expect(terrains).toEqual(new Set(TERRAINS));
  });

  it("keeps every terrain connected, legible, and structurally typed", () => {
    for (const terrain of TERRAINS) {
      const board = generateBoard(`forced-${terrain}`, terrain);
      const roles = board.nodes.reduce<Record<string, number>>(
        (counts, node) => ({
          ...counts,
          [node.type]: (counts[node.type] ?? 0) + 1,
        }),
        {},
      );
      const topology = analyzeTopology(board.nodes, board.edges);

      expect(board.terrain).toBe(terrain);
      expect(isConnected(board)).toBe(true);
      expect(roles.hub).toBe(HUB_COUNT);
      expect(roles.relay).toBe(RELAY_COUNT);
      expect(roles.normal).toBe(NODE_COUNT - HUB_COUNT - RELAY_COUNT);
      expect(Math.max(...Object.values(topology.degreeByNode))).toBeLessThanOrEqual(
        MAX_DEGREE,
      );

      for (let first = 0; first < board.nodes.length; first += 1) {
        for (let second = first + 1; second < board.nodes.length; second += 1) {
          expect(
            Math.hypot(
              board.nodes[first].x - board.nodes[second].x,
              board.nodes[first].y - board.nodes[second].y,
            ),
          ).toBeGreaterThanOrEqual(MIN_NODE_DISTANCE - 0.2);
        }
      }
    }
  });

  it("gives terrain families distinct strategic topology", () => {
    const boards = Object.fromEntries(
      TERRAINS.map((terrain) => [
        terrain,
        generateBoard(`profile-${terrain}`, terrain),
      ]),
    ) as Record<TerrainType, GeneratedBoard>;
    const topology = Object.fromEntries(
      TERRAINS.map((terrain) => [
        terrain,
        analyzeTopology(boards[terrain].nodes, boards[terrain].edges),
      ]),
    ) as Record<TerrainType, ReturnType<typeof analyzeTopology>>;

    expect(topology.ring.bridgeIds).toHaveLength(0);
    expect(topology.archipelago.bridgeIds).toHaveLength(2);
    expect(topology.hourglass.bridgeIds).toHaveLength(2);
    expect(topology.spine.bridgeIds.length).toBeGreaterThanOrEqual(5);
    expect(topology.core.bridgeIds).toHaveLength(3);
    expect(topology.twin.bridgeIds).toHaveLength(1);
    expect(topology.crossroads.bridgeIds).toHaveLength(4);
    expect(topology.constellation.bridgeIds).toHaveLength(5);
    expect(topology.fortress.bridgeIds).toHaveLength(0);
    expect(topology.river.bridgeIds).toHaveLength(0);
    expect(topology.basin.bridgeIds).toHaveLength(0);
    expect(topology.fortress.cycleCount).toBeGreaterThan(
      topology.trident.cycleCount,
    );
  });

  it("preserves each terrain's route and bottleneck profile across seeds", () => {
    for (const terrain of TERRAINS) {
      for (let seedIndex = 0; seedIndex < 12; seedIndex += 1) {
        const board = generateBoard(
          `profile-stress-${terrain}-${seedIndex}`,
          terrain,
        );
        const topology = analyzeTopology(board.nodes, board.edges);
        expect(board.edges).toHaveLength(EXPECTED_PROFILE[terrain].edges);
        expect(topology.bridgeIds).toHaveLength(
          EXPECTED_PROFILE[terrain].bridges,
        );
        expect(isConnected(board)).toBe(true);
      }
    }
  });

  it("places a Relay on a bottleneck whenever the terrain has bridges", () => {
    for (const terrain of TERRAINS.filter(
      (value) => EXPECTED_PROFILE[value].bridges > 0,
    )) {
      const board = generateBoard(`relay-${terrain}`, terrain);
      const bridgeIds = new Set(
        analyzeTopology(board.nodes, board.edges).bridgeIds,
      );
      const relayIds = new Set(
        board.nodes
          .filter((node) => node.type === "relay")
          .map((node) => node.id),
      );
      const relayTouchesBridge = board.edges.some(
        (edge) =>
          bridgeIds.has(edge.id) &&
          (relayIds.has(edge.sourceId) || relayIds.has(edge.targetId)),
      );
      expect(relayTouchesBridge).toBe(true);
    }
  });

  it("produces many distinct boards, not merely fifteen fixed templates", () => {
    const fingerprints = new Set<string>();
    for (let seedIndex = 0; seedIndex < 120; seedIndex += 1) {
      const board = generateBoard(`variety-${seedIndex}`);
      fingerprints.add(
        JSON.stringify({
          terrain: board.terrain,
          nodes: board.nodes.map((node) => [
            Math.round(node.x / 20),
            Math.round(node.y / 20),
            node.type,
          ]),
          edges: board.edges.map((edge) => edge.id),
        }),
      );
    }
    expect(fingerprints.size).toBeGreaterThanOrEqual(118);
  });
});

import {
  BOARD_HEIGHT,
  BOARD_PADDING,
  BOARD_WIDTH,
  MAX_DEGREE,
  MIN_NODE_DISTANCE,
  NODE_COUNT,
  NODE_TYPE_WEIGHTS,
  PROXIMITY_DISTANCE,
} from "./constants";
import { createSeededRandom, type RandomSource } from "./random";
import type { GameEdge, GameNode, NodeType } from "./types";

interface Pair {
  sourceIndex: number;
  targetIndex: number;
  distance: number;
}

interface Board {
  nodes: GameNode[];
  edges: GameEdge[];
}

function distanceBetween(
  first: Pick<GameNode, "x" | "y">,
  second: Pick<GameNode, "x" | "y">,
): number {
  return Math.hypot(first.x - second.x, first.y - second.y);
}

function pickNodeType(random: RandomSource): NodeType {
  const roll = random();
  if (roll < NODE_TYPE_WEIGHTS.normal) return "normal";
  if (roll < NODE_TYPE_WEIGHTS.normal + NODE_TYPE_WEIGHTS.hub) return "hub";
  return "relay";
}

function generateNodes(random: RandomSource): GameNode[] {
  const nodes: GameNode[] = [];
  const maxAttempts = NODE_COUNT * 180;
  let attempts = 0;

  while (nodes.length < NODE_COUNT && attempts < maxAttempts) {
    const candidate = {
      x: BOARD_PADDING + random() * (BOARD_WIDTH - BOARD_PADDING * 2),
      y: BOARD_PADDING + random() * (BOARD_HEIGHT - BOARD_PADDING * 2),
    };
    const relaxedDistance =
      attempts > maxAttempts * 0.72 ? MIN_NODE_DISTANCE * 0.78 : MIN_NODE_DISTANCE;

    if (nodes.every((node) => distanceBetween(node, candidate) >= relaxedDistance)) {
      nodes.push({
        id: `n${String(nodes.length + 1).padStart(2, "0")}`,
        x: Math.round(candidate.x * 10) / 10,
        y: Math.round(candidate.y * 10) / 10,
        type: pickNodeType(random),
        owner: null,
      });
    }

    attempts += 1;
  }

  // A bounded grid fallback keeps generation total and deterministic.
  while (nodes.length < NODE_COUNT) {
    const index = nodes.length;
    const column = index % 6;
    const row = Math.floor(index / 6);
    nodes.push({
      id: `n${String(index + 1).padStart(2, "0")}`,
      x: BOARD_PADDING + column * ((BOARD_WIDTH - BOARD_PADDING * 2) / 5),
      y: BOARD_PADDING + row * ((BOARD_HEIGHT - BOARD_PADDING * 2) / 3),
      type: pickNodeType(random),
      owner: null,
    });
  }

  return nodes;
}

function findRoot(parents: number[], index: number): number {
  let root = index;
  while (parents[root] !== root) root = parents[root];

  let current = index;
  while (parents[current] !== current) {
    const next = parents[current];
    parents[current] = root;
    current = next;
  }

  return root;
}

function buildPairs(nodes: GameNode[]): Pair[] {
  const pairs: Pair[] = [];

  for (let sourceIndex = 0; sourceIndex < nodes.length; sourceIndex += 1) {
    for (
      let targetIndex = sourceIndex + 1;
      targetIndex < nodes.length;
      targetIndex += 1
    ) {
      pairs.push({
        sourceIndex,
        targetIndex,
        distance: distanceBetween(nodes[sourceIndex], nodes[targetIndex]),
      });
    }
  }

  return pairs.sort(
    (first, second) =>
      first.distance - second.distance ||
      first.sourceIndex - second.sourceIndex ||
      first.targetIndex - second.targetIndex,
  );
}

function generateEdges(nodes: GameNode[]): GameEdge[] {
  const pairs = buildPairs(nodes);
  const degrees = Array.from({ length: nodes.length }, () => 0);
  const parents = nodes.map((_, index) => index);
  const edges: GameEdge[] = [];
  const usedPairs = new Set<string>();

  const addEdge = (pair: Pair): void => {
    const { sourceIndex, targetIndex } = pair;
    const key = `${sourceIndex}:${targetIndex}`;
    if (usedPairs.has(key)) return;

    usedPairs.add(key);
    degrees[sourceIndex] += 1;
    degrees[targetIndex] += 1;
    edges.push({
      id: `e-${nodes[sourceIndex].id}-${nodes[targetIndex].id}`,
      sourceId: nodes[sourceIndex].id,
      targetId: nodes[targetIndex].id,
    });
  };

  // A degree-constrained Kruskal pass produces a connected, sparse backbone.
  for (const pair of pairs) {
    const sourceRoot = findRoot(parents, pair.sourceIndex);
    const targetRoot = findRoot(parents, pair.targetIndex);
    if (
      sourceRoot !== targetRoot &&
      degrees[pair.sourceIndex] < MAX_DEGREE &&
      degrees[pair.targetIndex] < MAX_DEGREE
    ) {
      addEdge(pair);
      parents[targetRoot] = sourceRoot;
    }
  }

  // Nearby edges add tactical choices without exceeding the degree cap.
  for (const pair of pairs) {
    if (pair.distance > PROXIMITY_DISTANCE) break;
    if (
      degrees[pair.sourceIndex] < MAX_DEGREE &&
      degrees[pair.targetIndex] < MAX_DEGREE
    ) {
      addEdge(pair);
    }
  }

  return edges;
}

export function generateBoard(seed: string): Board {
  const random = createSeededRandom(seed);
  const nodes = generateNodes(random);
  const edges = generateEdges(nodes);
  return { nodes, edges };
}

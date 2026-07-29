import {
  BOARD_CANDIDATE_COUNT,
  BOARD_HEIGHT,
  BOARD_PADDING,
  BOARD_WIDTH,
  HUB_COUNT,
  MAX_DEGREE,
  MIN_NODE_DISTANCE,
  NODE_COUNT,
  RELAY_COUNT,
} from "./constants";
import { createSeededRandom, type RandomSource } from "./random";
import type {
  GameEdge,
  GameNode,
  NodeType,
  TerrainType,
} from "./types";

interface TerrainPoint {
  x: number;
  y: number;
  group: number;
}

interface Pair {
  sourceIndex: number;
  targetIndex: number;
  distance: number;
  priority: number;
}

interface CandidateBoard {
  nodes: GameNode[];
  edges: GameEdge[];
  score: number;
}

export interface GeneratedBoard {
  nodes: GameNode[];
  edges: GameEdge[];
  terrain: TerrainType;
}

export interface TopologyAnalysis {
  bridgeIds: string[];
  cycleCount: number;
  degreeByNode: Record<string, number>;
}

interface TerrainConfig {
  targetEdges: number;
  targetBridges: number;
  allowedLeaves: number;
}

const TERRAIN_ORDER: TerrainType[] = [
  "archipelago",
  "hourglass",
  "ring",
  "spine",
  "core",
];

const TERRAIN_CONFIG: Record<TerrainType, TerrainConfig> = {
  archipelago: { targetEdges: 32, targetBridges: 2, allowedLeaves: 2 },
  hourglass: { targetEdges: 31, targetBridges: 2, allowedLeaves: 2 },
  ring: { targetEdges: 35, targetBridges: 0, allowedLeaves: 0 },
  spine: { targetEdges: 30, targetBridges: 5, allowedLeaves: 3 },
  core: { targetEdges: 33, targetBridges: 3, allowedLeaves: 2 },
};

function distanceBetween(
  first: Pick<GameNode, "x" | "y">,
  second: Pick<GameNode, "x" | "y">,
): number {
  return Math.hypot(first.x - second.x, first.y - second.y);
}

function jitter(random: RandomSource, amount: number): number {
  return (random() - 0.5) * amount * 2;
}

function clusterPoints(
  centerX: number,
  centerY: number,
  count: number,
  radiusX: number,
  radiusY: number,
  group: number,
  random: RandomSource,
): TerrainPoint[] {
  const phase = random() * Math.PI * 2;
  return Array.from({ length: count }, (_, index) => {
    const fraction = Math.sqrt((index + 0.65) / count);
    const angle = phase + index * Math.PI * (3 - Math.sqrt(5));
    return {
      x:
        centerX +
        Math.cos(angle) * radiusX * fraction +
        jitter(random, 17),
      y:
        centerY +
        Math.sin(angle) * radiusY * fraction +
        jitter(random, 17),
      group,
    };
  });
}

function createArchipelago(random: RandomSource): TerrainPoint[] {
  const centers = [
    [225 + jitter(random, 35), 190 + jitter(random, 32)],
    [735 + jitter(random, 35), 205 + jitter(random, 32)],
    [480 + jitter(random, 45), 475 + jitter(random, 28)],
  ];

  return centers.flatMap(([x, y], group) =>
    clusterPoints(x, y, 8, 126, 105, group, random),
  );
}

function createHourglass(random: RandomSource): TerrainPoint[] {
  const left = clusterPoints(
    235 + jitter(random, 28),
    320 + jitter(random, 32),
    10,
    138,
    215,
    0,
    random,
  );
  const waist = [
    { x: 425, y: 245, group: 1 },
    { x: 535, y: 245, group: 1 },
    { x: 425, y: 395, group: 1 },
    { x: 535, y: 395, group: 1 },
  ].map((point) => ({
    ...point,
    x: point.x + jitter(random, 16),
    y: point.y + jitter(random, 18),
  }));
  const right = clusterPoints(
    725 + jitter(random, 28),
    320 + jitter(random, 32),
    10,
    138,
    215,
    2,
    random,
  );
  return [...left, ...waist, ...right];
}

function createRing(random: RandomSource): TerrainPoint[] {
  const phase = random() * Math.PI * 2;
  const outer = Array.from({ length: 18 }, (_, index) => {
    const angle = phase + (index / 18) * Math.PI * 2;
    return {
      x: 480 + Math.cos(angle) * (350 + jitter(random, 18)),
      y: 320 + Math.sin(angle) * (238 + jitter(random, 15)),
      group: 0,
    };
  });
  const inner = Array.from({ length: 6 }, (_, index) => {
    const angle = phase + Math.PI / 6 + (index / 6) * Math.PI * 2;
    return {
      x: 480 + Math.cos(angle) * (152 + jitter(random, 14)),
      y: 320 + Math.sin(angle) * (104 + jitter(random, 12)),
      group: 1,
    };
  });
  return [...outer, ...inner];
}

function createSpine(random: RandomSource): TerrainPoint[] {
  const points: TerrainPoint[] = [];
  const verticalFlip = random() < 0.5 ? -1 : 1;

  for (let group = 0; group < 6; group += 1) {
    const baseY = group % 2 === 0 ? 235 : 405;
    points.push(
      ...clusterPoints(
        145 + group * 134 + jitter(random, 12),
        320 + (baseY - 320) * verticalFlip + jitter(random, 24),
        4,
        68,
        69,
        group,
        random,
      ),
    );
  }
  return points;
}

function createCore(random: RandomSource): TerrainPoint[] {
  const core = clusterPoints(
    480 + jitter(random, 25),
    318 + jitter(random, 20),
    6,
    138,
    105,
    0,
    random,
  );
  const centers = [
    [205 + jitter(random, 25), 175 + jitter(random, 25)],
    [755 + jitter(random, 25), 175 + jitter(random, 25)],
    [480 + jitter(random, 32), 505 + jitter(random, 18)],
  ];
  const satellites = centers.flatMap(([x, y], index) =>
    clusterPoints(x, y, 6, 96, 84, index + 1, random),
  );
  return [...core, ...satellites];
}

function createTerrainPoints(
  terrain: TerrainType,
  random: RandomSource,
): TerrainPoint[] {
  const creators: Record<TerrainType, () => TerrainPoint[]> = {
    archipelago: () => createArchipelago(random),
    hourglass: () => createHourglass(random),
    ring: () => createRing(random),
    spine: () => createSpine(random),
    core: () => createCore(random),
  };
  const points = creators[terrain]();

  if (random() < 0.5) {
    for (const point of points) point.x = BOARD_WIDTH - point.x;
  }
  if (random() < 0.5) {
    for (const point of points) point.y = BOARD_HEIGHT - point.y;
  }

  for (let index = points.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [points[index], points[swapIndex]] = [points[swapIndex], points[index]];
  }

  return points;
}

function relaxPoints(points: TerrainPoint[]): TerrainPoint[] {
  const relaxed = points.map((point) => ({ ...point }));

  for (let iteration = 0; iteration < 90; iteration += 1) {
    for (let firstIndex = 0; firstIndex < relaxed.length; firstIndex += 1) {
      for (
        let secondIndex = firstIndex + 1;
        secondIndex < relaxed.length;
        secondIndex += 1
      ) {
        const first = relaxed[firstIndex];
        const second = relaxed[secondIndex];
        const deltaX = second.x - first.x;
        const deltaY = second.y - first.y;
        const distance = Math.max(Math.hypot(deltaX, deltaY), 0.01);
        if (distance >= MIN_NODE_DISTANCE) continue;

        const push = (MIN_NODE_DISTANCE - distance) * 0.52;
        const directionX = deltaX / distance;
        const directionY = deltaY / distance;
        first.x -= directionX * push;
        first.y -= directionY * push;
        second.x += directionX * push;
        second.y += directionY * push;
      }
    }

    for (const point of relaxed) {
      point.x = Math.min(
        BOARD_WIDTH - BOARD_PADDING,
        Math.max(BOARD_PADDING, point.x),
      );
      point.y = Math.min(
        BOARD_HEIGHT - BOARD_PADDING,
        Math.max(BOARD_PADDING, point.y),
      );
    }
  }

  return relaxed;
}

function toNodes(points: TerrainPoint[]): GameNode[] {
  return points.map((point, index) => ({
    id: `n${String(index + 1).padStart(2, "0")}`,
    x: Math.round(point.x * 10) / 10,
    y: Math.round(point.y * 10) / 10,
    type: "normal",
    owner: null,
  }));
}

function pairPenalty(
  terrain: TerrainType,
  sourceGroup: number,
  targetGroup: number,
): number {
  if (sourceGroup === targetGroup) return 0;
  if (terrain === "archipelago") return 900;
  if (terrain === "hourglass") {
    return Math.abs(sourceGroup - targetGroup) === 1 ? 500 : 1_400;
  }
  if (terrain === "spine") {
    return Math.abs(sourceGroup - targetGroup) === 1 ? 450 : 1_300;
  }
  if (terrain === "core") {
    return sourceGroup === 0 || targetGroup === 0 ? 500 : 1_250;
  }
  return 0;
}

function buildPairs(
  nodes: GameNode[],
  points: TerrainPoint[],
  terrain: TerrainType,
): Pair[] {
  const pairs: Pair[] = [];

  for (let sourceIndex = 0; sourceIndex < nodes.length; sourceIndex += 1) {
    for (
      let targetIndex = sourceIndex + 1;
      targetIndex < nodes.length;
      targetIndex += 1
    ) {
      const distance = distanceBetween(nodes[sourceIndex], nodes[targetIndex]);
      pairs.push({
        sourceIndex,
        targetIndex,
        distance,
        priority:
          distance +
          pairPenalty(
            terrain,
            points[sourceIndex].group,
            points[targetIndex].group,
          ),
      });
    }
  }

  return pairs.sort(
    (first, second) =>
      first.priority - second.priority ||
      first.distance - second.distance ||
      first.sourceIndex - second.sourceIndex ||
      first.targetIndex - second.targetIndex,
  );
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

function isTacticalPair(
  terrain: TerrainType,
  sourceGroup: number,
  targetGroup: number,
): boolean {
  if (terrain === "ring") return true;
  return sourceGroup === targetGroup;
}

function generateEdges(
  nodes: GameNode[],
  points: TerrainPoint[],
  terrain: TerrainType,
): GameEdge[] {
  const pairs = buildPairs(nodes, points, terrain);
  const pairByKey = new Map(
    pairs.map((pair) => [
      `${pair.sourceIndex}:${pair.targetIndex}`,
      pair,
    ]),
  );
  const degrees = Array.from({ length: nodes.length }, () => 0);
  const parents = nodes.map((_, index) => index);
  const usedPairs = new Set<string>();
  const edges: GameEdge[] = [];

  const addEdge = (pair: Pair): void => {
    const key = `${pair.sourceIndex}:${pair.targetIndex}`;
    if (usedPairs.has(key)) return;
    usedPairs.add(key);
    degrees[pair.sourceIndex] += 1;
    degrees[pair.targetIndex] += 1;
    edges.push({
      id: `e-${nodes[pair.sourceIndex].id}-${nodes[pair.targetIndex].id}`,
      sourceId: nodes[pair.sourceIndex].id,
      targetId: nodes[pair.targetIndex].id,
    });
  };

  const connectPair = (pair: Pair): void => {
    const sourceRoot = findRoot(parents, pair.sourceIndex);
    const targetRoot = findRoot(parents, pair.targetIndex);
    addEdge(pair);
    if (sourceRoot !== targetRoot) parents[targetRoot] = sourceRoot;
  };

  // Every strategic region starts with a closed local route. This prevents
  // accidental dead ends inside a cluster and reserves bridges for the
  // meaningful boundaries between regions.
  const groups = new Map<number, number[]>();
  for (let index = 0; index < points.length; index += 1) {
    const group = points[index].group;
    groups.set(group, [...(groups.get(group) ?? []), index]);
  }
  for (const indices of groups.values()) {
    const centerX =
      indices.reduce((sum, index) => sum + nodes[index].x, 0) / indices.length;
    const centerY =
      indices.reduce((sum, index) => sum + nodes[index].y, 0) / indices.length;
    const ordered = [...indices].sort(
      (first, second) =>
        Math.atan2(nodes[first].y - centerY, nodes[first].x - centerX) -
        Math.atan2(nodes[second].y - centerY, nodes[second].x - centerX),
    );

    for (let index = 0; index < ordered.length; index += 1) {
      const sourceIndex = Math.min(
        ordered[index],
        ordered[(index + 1) % ordered.length],
      );
      const targetIndex = Math.max(
        ordered[index],
        ordered[(index + 1) % ordered.length],
      );
      const pair = pairByKey.get(`${sourceIndex}:${targetIndex}`);
      if (pair) connectPair(pair);
    }
  }

  // A group-aware Kruskal pass joins local routes. Penalized cross-region
  // pairs make the resulting bridges intentional instead of accidental.
  for (const pair of pairs) {
    const sourceRoot = findRoot(parents, pair.sourceIndex);
    const targetRoot = findRoot(parents, pair.targetIndex);
    if (
      sourceRoot !== targetRoot &&
      degrees[pair.sourceIndex] < MAX_DEGREE &&
      degrees[pair.targetIndex] < MAX_DEGREE
    ) {
      connectPair(pair);
    }
  }

  const targetEdges = TERRAIN_CONFIG[terrain].targetEdges;
  for (const pair of pairs) {
    if (edges.length >= targetEdges) break;
    if (
      degrees[pair.sourceIndex] < MAX_DEGREE &&
      degrees[pair.targetIndex] < MAX_DEGREE &&
      isTacticalPair(
        terrain,
        points[pair.sourceIndex].group,
        points[pair.targetIndex].group,
      )
    ) {
      addEdge(pair);
    }
  }

  return edges;
}

export function analyzeTopology(
  nodes: GameNode[],
  edges: GameEdge[],
): TopologyAnalysis {
  const adjacency = new Map<
    string,
    Array<{ nodeId: string; edgeId: string }>
  >(nodes.map((node) => [node.id, []]));
  const degreeByNode: Record<string, number> = {};

  for (const node of nodes) degreeByNode[node.id] = 0;
  for (const edge of edges) {
    adjacency.get(edge.sourceId)?.push({
      nodeId: edge.targetId,
      edgeId: edge.id,
    });
    adjacency.get(edge.targetId)?.push({
      nodeId: edge.sourceId,
      edgeId: edge.id,
    });
    degreeByNode[edge.sourceId] += 1;
    degreeByNode[edge.targetId] += 1;
  }

  const visitOrder = new Map<string, number>();
  const lowLink = new Map<string, number>();
  const bridgeIds: string[] = [];
  let time = 0;

  const visit = (nodeId: string, parentEdgeId: string | null): void => {
    time += 1;
    visitOrder.set(nodeId, time);
    lowLink.set(nodeId, time);

    for (const neighbor of adjacency.get(nodeId) ?? []) {
      if (neighbor.edgeId === parentEdgeId) continue;
      if (!visitOrder.has(neighbor.nodeId)) {
        visit(neighbor.nodeId, neighbor.edgeId);
        lowLink.set(
          nodeId,
          Math.min(
            lowLink.get(nodeId) ?? Number.POSITIVE_INFINITY,
            lowLink.get(neighbor.nodeId) ?? Number.POSITIVE_INFINITY,
          ),
        );
        if (
          (lowLink.get(neighbor.nodeId) ?? 0) >
          (visitOrder.get(nodeId) ?? 0)
        ) {
          bridgeIds.push(neighbor.edgeId);
        }
      } else {
        lowLink.set(
          nodeId,
          Math.min(
            lowLink.get(nodeId) ?? Number.POSITIVE_INFINITY,
            visitOrder.get(neighbor.nodeId) ?? Number.POSITIVE_INFINITY,
          ),
        );
      }
    }
  };

  for (const node of nodes) {
    if (!visitOrder.has(node.id)) visit(node.id, null);
  }

  const connectedComponents =
    nodes.length === 0
      ? 0
      : (() => {
          const seen = new Set<string>();
          let count = 0;
          for (const node of nodes) {
            if (seen.has(node.id)) continue;
            count += 1;
            const queue = [node.id];
            seen.add(node.id);
            while (queue.length > 0) {
              const current = queue.shift();
              if (!current) continue;
              for (const neighbor of adjacency.get(current) ?? []) {
                if (!seen.has(neighbor.nodeId)) {
                  seen.add(neighbor.nodeId);
                  queue.push(neighbor.nodeId);
                }
              }
            }
          }
          return count;
        })();

  return {
    bridgeIds: bridgeIds.sort(),
    cycleCount: edges.length - nodes.length + connectedComponents,
    degreeByNode,
  };
}

function scoreCandidate(
  nodes: GameNode[],
  edges: GameEdge[],
  terrain: TerrainType,
): number {
  const config = TERRAIN_CONFIG[terrain];
  const analysis = analyzeTopology(nodes, edges);
  const degrees = Object.values(analysis.degreeByNode);
  const leaves = degrees.filter((degree) => degree === 1).length;
  const junctions = degrees.filter((degree) => degree >= 3).length;
  const edgeLengths = edges.map((edge) => {
    const source = nodes.find((node) => node.id === edge.sourceId);
    const target = nodes.find((node) => node.id === edge.targetId);
    return source && target ? distanceBetween(source, target) : BOARD_WIDTH;
  });
  const longEdgePenalty = edgeLengths.reduce(
    (sum, length) => sum + Math.max(0, length - 300) / 90,
    0,
  );
  const targetCycles = config.targetEdges - NODE_COUNT + 1;

  return (
    100 -
    Math.abs(analysis.bridgeIds.length - config.targetBridges) * 10 -
    Math.abs(analysis.cycleCount - targetCycles) * 5 -
    Math.max(0, leaves - config.allowedLeaves) * 4 +
    junctions * 0.65 -
    longEdgePenalty
  );
}

function shortestPathSums(nodes: GameNode[], edges: GameEdge[]): Map<string, number> {
  const adjacency = new Map<string, string[]>(
    nodes.map((node) => [node.id, []]),
  );
  for (const edge of edges) {
    adjacency.get(edge.sourceId)?.push(edge.targetId);
    adjacency.get(edge.targetId)?.push(edge.sourceId);
  }

  const sums = new Map<string, number>();
  for (const origin of nodes) {
    const distances = new Map<string, number>([[origin.id, 0]]);
    const queue = [origin.id];
    while (queue.length > 0) {
      const current = queue.shift();
      if (!current) continue;
      const nextDistance = (distances.get(current) ?? 0) + 1;
      for (const neighbor of adjacency.get(current) ?? []) {
        if (!distances.has(neighbor)) {
          distances.set(neighbor, nextDistance);
          queue.push(neighbor);
        }
      }
    }
    sums.set(
      origin.id,
      [...distances.values()].reduce((sum, value) => sum + value, 0),
    );
  }
  return sums;
}

function assignNodeTypes(
  nodes: GameNode[],
  edges: GameEdge[],
  seed: string,
): GameNode[] {
  const random = createSeededRandom(`${seed}:roles`);
  const analysis = analyzeTopology(nodes, edges);
  const bridgeSet = new Set(analysis.bridgeIds);
  const bridgeIncidence = new Map(nodes.map((node) => [node.id, 0]));
  const adjacency = new Map(nodes.map((node) => [node.id, new Set<string>()]));

  for (const edge of edges) {
    adjacency.get(edge.sourceId)?.add(edge.targetId);
    adjacency.get(edge.targetId)?.add(edge.sourceId);
    if (bridgeSet.has(edge.id)) {
      bridgeIncidence.set(
        edge.sourceId,
        (bridgeIncidence.get(edge.sourceId) ?? 0) + 1,
      );
      bridgeIncidence.set(
        edge.targetId,
        (bridgeIncidence.get(edge.targetId) ?? 0) + 1,
      );
    }
  }

  const pathSums = shortestPathSums(nodes, edges);
  const roleScores = new Map(
    nodes.map((node) => {
      const closeness = 1 / Math.max(1, pathSums.get(node.id) ?? 1);
      return [
        node.id,
        {
          relay:
            (bridgeIncidence.get(node.id) ?? 0) * 100 +
            (analysis.degreeByNode[node.id] ?? 0) * 7 +
            closeness * 1_000 +
            random(),
          hub:
            (analysis.degreeByNode[node.id] ?? 0) * 24 +
            closeness * 1_800 +
            random(),
        },
      ];
    }),
  );

  const relayIds: string[] = [];
  const relayCandidates = [...nodes].sort(
    (first, second) =>
      (roleScores.get(second.id)?.relay ?? 0) -
      (roleScores.get(first.id)?.relay ?? 0),
  );
  while (relayIds.length < RELAY_COUNT) {
    const nonAdjacent = relayCandidates.find(
      (node) =>
        !relayIds.includes(node.id) &&
        relayIds.every(
          (relayId) => !adjacency.get(relayId)?.has(node.id),
        ),
    );
    const fallback = relayCandidates.find(
      (node) => !relayIds.includes(node.id),
    );
    const selected = nonAdjacent ?? fallback;
    if (!selected) break;
    relayIds.push(selected.id);
  }

  const relaySet = new Set(relayIds);
  const hubIds = nodes
    .filter((node) => !relaySet.has(node.id))
    .sort(
      (first, second) =>
        (roleScores.get(second.id)?.hub ?? 0) -
        (roleScores.get(first.id)?.hub ?? 0),
    )
    .slice(0, HUB_COUNT)
    .map((node) => node.id);
  const hubSet = new Set(hubIds);

  return nodes.map((node): GameNode => {
    let type: NodeType = "normal";
    if (relaySet.has(node.id)) type = "relay";
    else if (hubSet.has(node.id)) type = "hub";
    return { ...node, type };
  });
}

function generateCandidate(
  seed: string,
  terrain: TerrainType,
): CandidateBoard {
  const random = createSeededRandom(seed);
  const points = relaxPoints(createTerrainPoints(terrain, random));
  const nodes = toNodes(points);
  const edges = generateEdges(nodes, points, terrain);
  return {
    nodes,
    edges,
    score: scoreCandidate(nodes, edges, terrain),
  };
}

function chooseTerrain(seed: string): TerrainType {
  const random = createSeededRandom(`${seed}:terrain`);
  return TERRAIN_ORDER[Math.floor(random() * TERRAIN_ORDER.length)];
}

export function generateBoard(
  seed: string,
  terrainOverride?: TerrainType,
): GeneratedBoard {
  const terrain = terrainOverride ?? chooseTerrain(seed);
  let best: CandidateBoard | null = null;

  for (
    let candidateIndex = 0;
    candidateIndex < BOARD_CANDIDATE_COUNT;
    candidateIndex += 1
  ) {
    const candidate = generateCandidate(
      `${seed}:${terrain}:candidate-${candidateIndex}`,
      terrain,
    );
    if (!best || candidate.score > best.score) best = candidate;
  }

  if (!best) {
    throw new Error("Board generation produced no candidates.");
  }

  return {
    nodes: assignNodeTypes(best.nodes, best.edges, seed),
    edges: best.edges,
    terrain,
  };
}

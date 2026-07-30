import { NODE_BASE_POINTS } from "./constants";
import type {
  GameEdge,
  GameNode,
  GameScore,
  Owner,
  ScoreCategory,
  ScoreBreakdown,
  ScoreEvidence,
  Turn,
} from "./types";

export interface LongestRoute {
  distance: number;
  points: number;
  nodeIds: string[];
  edgeIds: string[];
}

function emptyBreakdown(): ScoreBreakdown {
  return { base: 0, connections: 0, influence: 0, route: 0, total: 0 };
}

function influenceWeight(node: GameNode): number {
  return node.type === "hub" ? 2 : 1;
}

export function connectionValue(first: GameNode, second: GameNode): number {
  return first.type === "relay" || second.type === "relay" ? 2 : 1;
}

function canonicalizeRoute(
  nodeIds: string[],
  edgeIds: string[],
): { nodeIds: string[]; edgeIds: string[]; key: string } {
  const forwardKey = nodeIds.join(">");
  const reversedNodeIds = [...nodeIds].reverse();
  const reverseKey = reversedNodeIds.join(">");
  return forwardKey <= reverseKey
    ? { nodeIds: [...nodeIds], edgeIds: [...edgeIds], key: forwardKey }
    : {
        nodeIds: reversedNodeIds,
        edgeIds: [...edgeIds].reverse(),
        key: reverseKey,
      };
}

export function getLongestRoute(
  nodes: GameNode[],
  edges: GameEdge[],
  owner: Turn,
): LongestRoute {
  const ownedIds = new Set(
    nodes.filter((node) => node.owner === owner).map((node) => node.id),
  );
  const adjacency = new Map<
    string,
    Array<{ nodeId: string; edgeId: string }>
  >([...ownedIds].map((nodeId) => [nodeId, []]));

  for (const edge of edges) {
    if (!ownedIds.has(edge.sourceId) || !ownedIds.has(edge.targetId)) continue;
    adjacency.get(edge.sourceId)?.push({
      nodeId: edge.targetId,
      edgeId: edge.id,
    });
    adjacency.get(edge.targetId)?.push({
      nodeId: edge.sourceId,
      edgeId: edge.id,
    });
  }
  for (const neighbors of adjacency.values()) {
    neighbors.sort(
      (first, second) =>
        first.nodeId.localeCompare(second.nodeId) ||
        first.edgeId.localeCompare(second.edgeId),
    );
  }

  let bestNodeIds: string[] = [];
  let bestEdgeIds: string[] = [];
  let bestKey = "";

  const consider = (nodeIds: string[], edgeIds: string[]): void => {
    const canonical = canonicalizeRoute(nodeIds, edgeIds);
    if (
      edgeIds.length > bestEdgeIds.length ||
      (edgeIds.length === bestEdgeIds.length &&
        (bestKey === "" || canonical.key < bestKey))
    ) {
      bestNodeIds = canonical.nodeIds;
      bestEdgeIds = canonical.edgeIds;
      bestKey = canonical.key;
    }
  };

  const visit = (
    currentId: string,
    visited: Set<string>,
    nodeIds: string[],
    edgeIds: string[],
  ): void => {
    consider(nodeIds, edgeIds);
    for (const neighbor of adjacency.get(currentId) ?? []) {
      if (visited.has(neighbor.nodeId)) continue;
      visited.add(neighbor.nodeId);
      nodeIds.push(neighbor.nodeId);
      edgeIds.push(neighbor.edgeId);
      visit(neighbor.nodeId, visited, nodeIds, edgeIds);
      edgeIds.pop();
      nodeIds.pop();
      visited.delete(neighbor.nodeId);
    }
  };

  for (const startId of [...ownedIds].sort()) {
    visit(startId, new Set([startId]), [startId], []);
  }

  const distance = bestEdgeIds.length;
  return {
    distance,
    points: Math.min(5, Math.floor(distance / 2)),
    nodeIds: bestNodeIds,
    edgeIds: bestEdgeIds,
  };
}

export function getScoreEvidence(
  nodes: GameNode[],
  edges: GameEdge[],
  owner: Turn,
  category: ScoreCategory,
): ScoreEvidence {
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const nodeIds = new Set<string>();
  const edgeIds = new Set<string>();
  const targetNodeIds = new Set<string>();
  const contributorNodeIds = new Set<string>();

  if (category === "base") {
    const ownedNodes = nodes.filter((node) => node.owner === owner);
    for (const node of ownedNodes) nodeIds.add(node.id);
    return {
      owner,
      category,
      points: ownedNodes.reduce(
        (total, node) => total + NODE_BASE_POINTS[node.type],
        0,
      ),
      itemCount: ownedNodes.length,
      nodeIds: [...nodeIds],
      edgeIds: [],
      targetNodeIds: [],
      contributorNodeIds: [],
    };
  }

  if (category === "connections") {
    let points = 0;
    let itemCount = 0;
    for (const edge of edges) {
      const source = nodeById.get(edge.sourceId);
      const target = nodeById.get(edge.targetId);
      if (source?.owner === owner && target?.owner === owner) {
        points += connectionValue(source, target);
        itemCount += 1;
        edgeIds.add(edge.id);
        nodeIds.add(source.id);
        nodeIds.add(target.id);
      }
    }
    return {
      owner,
      category,
      points,
      itemCount,
      nodeIds: [...nodeIds],
      edgeIds: [...edgeIds],
      targetNodeIds: [],
      contributorNodeIds: [],
    };
  }

  if (category === "route") {
    const route = getLongestRoute(nodes, edges, owner);
    return {
      owner,
      category,
      points: route.points,
      itemCount: route.distance,
      nodeIds: route.nodeIds,
      edgeIds: route.edgeIds,
      targetNodeIds: [],
      contributorNodeIds: [],
    };
  }

  const links = new Map<
    string,
    Array<{ neighbor: GameNode; edge: GameEdge }>
  >(nodes.map((node) => [node.id, []]));

  for (const edge of edges) {
    const source = nodeById.get(edge.sourceId);
    const target = nodeById.get(edge.targetId);
    if (!source || !target) continue;
    links.get(source.id)?.push({ neighbor: target, edge });
    links.get(target.id)?.push({ neighbor: source, edge });
  }

  for (const target of nodes) {
    const totals: Record<Turn, number> = { player: 0, cpu: 0 };
    for (const { neighbor } of links.get(target.id) ?? []) {
      if (neighbor.owner) totals[neighbor.owner] += influenceWeight(neighbor);
    }
    const otherOwner = owner === "player" ? "cpu" : "player";
    if (totals[owner] <= totals[otherOwner]) continue;

    targetNodeIds.add(target.id);
    nodeIds.add(target.id);
    for (const { neighbor, edge } of links.get(target.id) ?? []) {
      if (neighbor.owner !== owner) continue;
      contributorNodeIds.add(neighbor.id);
      nodeIds.add(neighbor.id);
      edgeIds.add(edge.id);
    }
  }

  return {
    owner,
    category,
    points: targetNodeIds.size,
    itemCount: targetNodeIds.size,
    nodeIds: [...nodeIds],
    edgeIds: [...edgeIds],
    targetNodeIds: [...targetNodeIds],
    contributorNodeIds: [...contributorNodeIds],
  };
}

export function calculateScore(nodes: GameNode[], edges: GameEdge[]): GameScore {
  const score: Record<Turn, ScoreBreakdown> = {
    player: emptyBreakdown(),
    cpu: emptyBreakdown(),
  };
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const neighbors = new Map<string, GameNode[]>(
    nodes.map((node) => [node.id, []]),
  );

  for (const node of nodes) {
    if (node.owner) {
      score[node.owner].base += NODE_BASE_POINTS[node.type];
    }
  }

  for (const edge of edges) {
    const source = nodeById.get(edge.sourceId);
    const target = nodeById.get(edge.targetId);
    if (!source || !target) continue;

    neighbors.get(source.id)?.push(target);
    neighbors.get(target.id)?.push(source);

    if (source.owner && source.owner === target.owner) {
      score[source.owner].connections += connectionValue(source, target);
    }
  }

  // Every board node is an influence target, including already owned nodes.
  for (const node of nodes) {
    const totals: Record<Exclude<Owner, null>, number> = { player: 0, cpu: 0 };

    for (const neighbor of neighbors.get(node.id) ?? []) {
      if (neighbor.owner) {
        totals[neighbor.owner] += influenceWeight(neighbor);
      }
    }

    if (totals.player > totals.cpu) score.player.influence += 1;
    if (totals.cpu > totals.player) score.cpu.influence += 1;
  }

  score.player.route = getLongestRoute(nodes, edges, "player").points;
  score.cpu.route = getLongestRoute(nodes, edges, "cpu").points;
  score.player.total =
    score.player.base +
    score.player.connections +
    score.player.influence +
    score.player.route;
  score.cpu.total =
    score.cpu.base +
    score.cpu.connections +
    score.cpu.influence +
    score.cpu.route;

  return score;
}

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

function emptyBreakdown(): ScoreBreakdown {
  return { base: 0, connections: 0, influence: 0, total: 0 };
}

function influenceWeight(node: GameNode): number {
  return node.type === "hub" ? 2 : 1;
}

export function connectionValue(first: GameNode, second: GameNode): number {
  return first.type === "relay" || second.type === "relay" ? 2 : 1;
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

  score.player.total =
    score.player.base + score.player.connections + score.player.influence;
  score.cpu.total = score.cpu.base + score.cpu.connections + score.cpu.influence;

  return score;
}

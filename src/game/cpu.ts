import { NODE_BASE_POINTS } from "./constants";
import { connectionValue } from "./scoring";
import type { GameEdge, GameNode } from "./types";
import type { RandomSource } from "./random";

export interface CpuEvaluation {
  nodeId: string;
  value: number;
}

export function evaluateCpuMoves(
  nodes: GameNode[],
  edges: GameEdge[],
): CpuEvaluation[] {
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const adjacent = new Map<string, GameNode[]>(
    nodes.map((node) => [node.id, []]),
  );

  for (const edge of edges) {
    const source = nodeById.get(edge.sourceId);
    const target = nodeById.get(edge.targetId);
    if (!source || !target) continue;
    adjacent.get(source.id)?.push(target);
    adjacent.get(target.id)?.push(source);
  }

  return nodes
    .filter((node) => node.owner === null)
    .map((node) => {
      const neighbors = adjacent.get(node.id) ?? [];
      const cpuNeighbors = neighbors.filter((item) => item.owner === "cpu");
      const playerNeighbors = neighbors.filter((item) => item.owner === "player");
      const connectionGain = cpuNeighbors.reduce(
        (total, neighbor) => total + connectionValue(node, neighbor),
        0,
      );
      const blockedConnectionValue = playerNeighbors.reduce(
        (total, neighbor) => total + connectionValue(node, neighbor),
        0,
      );

      const value =
        NODE_BASE_POINTS[node.type] * 3 +
        cpuNeighbors.length * 1.3 +
        playerNeighbors.length * 1.1 +
        (node.type === "hub" ? 1.4 : 0) +
        (node.type === "relay" ? 0.8 : 0) +
        connectionGain * 2 +
        blockedConnectionValue * 1.25 +
        neighbors.length * 0.15;

      return { nodeId: node.id, value };
    });
}

export function chooseCpuMove(
  nodes: GameNode[],
  edges: GameEdge[],
  random: RandomSource,
): string | null {
  const evaluations = evaluateCpuMoves(nodes, edges);
  if (evaluations.length === 0) return null;

  const bestValue = Math.max(...evaluations.map((item) => item.value));
  const bestMoves = evaluations.filter(
    (item) => Math.abs(item.value - bestValue) < Number.EPSILON,
  );
  return bestMoves[Math.floor(random() * bestMoves.length)]?.nodeId ?? null;
}

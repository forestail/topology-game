import type { GameEdge, GameNode, GameState } from "./types";

export function getNodeMap(nodes: GameNode[]): Map<string, GameNode> {
  return new Map(nodes.map((node) => [node.id, node]));
}

export function getEdgeOwner(
  edge: GameEdge,
  nodeMap: Map<string, GameNode>,
): "player" | "cpu" | "mixed" | "neutral" {
  const source = nodeMap.get(edge.sourceId);
  const target = nodeMap.get(edge.targetId);

  if (!source?.owner && !target?.owner) return "neutral";
  if (source?.owner && source.owner === target?.owner) return source.owner;
  return "mixed";
}

export function getRemainingCount(state: GameState): number {
  return state.nodes.length - state.playerSelections.length - state.cpuSelections.length;
}

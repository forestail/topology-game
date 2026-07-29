import { NODE_BASE_POINTS } from "./constants";
import { calculateScore, connectionValue } from "./scoring";
import type { CpuDifficulty, GameEdge, GameNode, Turn } from "./types";
import type { RandomSource } from "./random";

export interface CpuEvaluation {
  nodeId: string;
  value: number;
}

function claimNode(
  nodes: GameNode[],
  nodeId: string,
  owner: Turn,
): GameNode[] {
  return nodes.map((node) =>
    node.id === nodeId ? { ...node, owner } : node,
  );
}

function pickBest(
  evaluations: CpuEvaluation[],
  random: RandomSource,
): string | null {
  if (evaluations.length === 0) return null;
  const bestValue = Math.max(...evaluations.map((item) => item.value));
  const bestMoves = evaluations.filter(
    (item) => Math.abs(item.value - bestValue) < Number.EPSILON,
  );
  return bestMoves[Math.floor(random() * bestMoves.length)]?.nodeId ?? null;
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

export function evaluateHardCpuMoves(
  nodes: GameNode[],
  edges: GameEdge[],
): CpuEvaluation[] {
  const heuristicById = new Map(
    evaluateCpuMoves(nodes, edges).map((item) => [item.nodeId, item.value]),
  );

  return nodes
    .filter((node) => node.owner === null)
    .map((candidate) => {
      const afterCpu = claimNode(nodes, candidate.id, "cpu");
      const immediateScore = calculateScore(afterCpu, edges);
      const immediateMargin =
        immediateScore.cpu.total - immediateScore.player.total;
      const replies = afterCpu.filter((node) => node.owner === null);

      const worstReplyMargin =
        replies.length === 0
          ? immediateMargin
          : Math.min(
              ...replies.map((reply) => {
                const afterReply = claimNode(afterCpu, reply.id, "player");
                const replyScore = calculateScore(afterReply, edges);
                return replyScore.cpu.total - replyScore.player.total;
              }),
            );

      return {
        nodeId: candidate.id,
        value:
          immediateMargin * 1.25 +
          worstReplyMargin * 3 +
          (heuristicById.get(candidate.id) ?? 0) * 0.25,
      };
    });
}

export function chooseCpuMove(
  nodes: GameNode[],
  edges: GameEdge[],
  random: RandomSource,
  difficulty: CpuDifficulty = "standard",
): string | null {
  const evaluations = evaluateCpuMoves(nodes, edges);
  if (evaluations.length === 0) return null;

  if (difficulty === "easy") {
    const ranked = [...evaluations].sort(
      (first, second) =>
        second.value - first.value || first.nodeId.localeCompare(second.nodeId),
    );
    const poolSize = Math.min(
      ranked.length,
      Math.max(2, Math.ceil(ranked.length * 0.25)),
    );
    return ranked[Math.floor(random() * poolSize)]?.nodeId ?? null;
  }

  if (difficulty === "hard") {
    return pickBest(evaluateHardCpuMoves(nodes, edges), random);
  }

  return pickBest(evaluations, random);
}

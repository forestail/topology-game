import { getLongestRoute, getScoreEvidence } from "./scoring";
import type {
  GameEdge,
  GameNode,
  GameScore,
  ScoreCategory,
  ScoreInspection,
  Turn,
  Winner,
} from "./types";

export type LossCategoryStatus = "favorable" | "unfavorable" | "even";

export interface LossCategoryAnalysis {
  category: ScoreCategory;
  label: string;
  playerPoints: number;
  cpuPoints: number;
  playerDelta: number;
  status: LossCategoryStatus;
  comparisonText: string;
  inspection: ScoreInspection;
}

export interface LossAnalysis {
  finalMargin: number;
  primaryCategories: ScoreCategory[];
  primaryTitle: string;
  primaryDetails: string[];
  categories: LossCategoryAnalysis[];
  tacticalNotes: string[];
}

interface OwnerMetrics {
  ownedNodes: number;
  hubs: number;
  relays: number;
  connections: number;
  relayConnections: number;
  influenceTargets: number;
  influenceContributors: number;
  routeDistance: number;
  routePoints: number;
  components: number;
  highestDegreeNodes: number;
}

const CATEGORY_PRIORITY: ScoreCategory[] = [
  "influence",
  "connections",
  "route",
  "base",
];
const CATEGORY_DISPLAY_ORDER: ScoreCategory[] = [
  "base",
  "connections",
  "influence",
  "route",
];

export const LOSS_CATEGORY_LABELS: Record<ScoreCategory, string> = {
  base: "基本点",
  connections: "接続点",
  influence: "影響点",
  route: "最長ルート",
};

export function canAnalyzeLoss(winner: Winner): winner is "cpu" {
  return winner === "cpu";
}

function countComponents(
  nodes: GameNode[],
  edges: GameEdge[],
  owner: Turn,
): number {
  const ownedIds = new Set(
    nodes.filter((node) => node.owner === owner).map((node) => node.id),
  );
  const adjacency = new Map<string, string[]>(
    [...ownedIds].map((nodeId) => [nodeId, []]),
  );

  for (const edge of edges) {
    if (!ownedIds.has(edge.sourceId) || !ownedIds.has(edge.targetId)) continue;
    adjacency.get(edge.sourceId)?.push(edge.targetId);
    adjacency.get(edge.targetId)?.push(edge.sourceId);
  }

  let components = 0;
  const visited = new Set<string>();
  for (const nodeId of ownedIds) {
    if (visited.has(nodeId)) continue;
    components += 1;
    const pending = [nodeId];
    visited.add(nodeId);
    while (pending.length > 0) {
      const currentId = pending.pop();
      if (!currentId) continue;
      for (const neighborId of adjacency.get(currentId) ?? []) {
        if (visited.has(neighborId)) continue;
        visited.add(neighborId);
        pending.push(neighborId);
      }
    }
  }
  return components;
}

function getOwnerMetrics(
  nodes: GameNode[],
  edges: GameEdge[],
  owner: Turn,
  maxDegree: number,
  degreeByNode: Map<string, number>,
): OwnerMetrics {
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const ownedNodes = nodes.filter((node) => node.owner === owner);
  const friendlyEdges = edges.filter((edge) => {
    const source = nodeById.get(edge.sourceId);
    const target = nodeById.get(edge.targetId);
    return source?.owner === owner && target?.owner === owner;
  });
  const influence = getScoreEvidence(nodes, edges, owner, "influence");
  const route = getLongestRoute(nodes, edges, owner);

  return {
    ownedNodes: ownedNodes.length,
    hubs: ownedNodes.filter((node) => node.type === "hub").length,
    relays: ownedNodes.filter((node) => node.type === "relay").length,
    connections: friendlyEdges.length,
    relayConnections: friendlyEdges.filter((edge) => {
      const source = nodeById.get(edge.sourceId);
      const target = nodeById.get(edge.targetId);
      return source?.type === "relay" || target?.type === "relay";
    }).length,
    influenceTargets: influence.targetNodeIds.length,
    influenceContributors: influence.contributorNodeIds.length,
    routeDistance: route.distance,
    routePoints: route.points,
    components: countComponents(nodes, edges, owner),
    highestDegreeNodes:
      maxDegree < 3
        ? 0
        : ownedNodes.filter((node) => degreeByNode.get(node.id) === maxDegree)
            .length,
  };
}

function categoryObservation(
  category: ScoreCategory,
  cpuLead: number,
  player: OwnerMetrics,
  cpu: OwnerMetrics,
): string {
  if (category === "influence") {
    return `CPUは${cpu.influenceTargets}個、Playerは${player.influenceTargets}個のターゲットで影響点を獲得し、${cpuLead}点差がつきました。`;
  }
  if (category === "connections") {
    return `CPUは同一所有者接続を${cpu.connections}本、Playerは${player.connections}本形成しました。Relayを含む接続はCPU ${cpu.relayConnections}本、Player ${player.relayConnections}本でした。`;
  }
  if (category === "route") {
    return `CPUの最長ルートは${cpu.routeDistance}接続、Playerは${player.routeDistance}接続で、ボーナスに${cpuLead}点差がつきました。`;
  }
  return `CPUはHubを${cpu.hubs}個、Playerは${player.hubs}個所有し、基本点で${cpuLead}点差がつきました。`;
}

function categoryComparison(
  playerPoints: number,
  cpuPoints: number,
): Pick<
  LossCategoryAnalysis,
  "playerDelta" | "status" | "comparisonText"
> {
  const playerDelta = playerPoints - cpuPoints;
  if (playerDelta < 0) {
    return {
      playerDelta,
      status: "unfavorable",
      comparisonText: `CPUが${Math.abs(playerDelta)}点リード`,
    };
  }
  if (playerDelta > 0) {
    return {
      playerDelta,
      status: "favorable",
      comparisonText: `Playerが${playerDelta}点リード`,
    };
  }
  return {
    playerDelta,
    status: "even",
    comparisonText: "互角",
  };
}

export function analyzeLoss(
  nodes: GameNode[],
  edges: GameEdge[],
  score: GameScore,
): LossAnalysis {
  const degreeByNode = new Map(nodes.map((node) => [node.id, 0]));
  for (const edge of edges) {
    degreeByNode.set(
      edge.sourceId,
      (degreeByNode.get(edge.sourceId) ?? 0) + 1,
    );
    degreeByNode.set(
      edge.targetId,
      (degreeByNode.get(edge.targetId) ?? 0) + 1,
    );
  }
  const maxDegree = Math.max(0, ...degreeByNode.values());
  const playerMetrics = getOwnerMetrics(
    nodes,
    edges,
    "player",
    maxDegree,
    degreeByNode,
  );
  const cpuMetrics = getOwnerMetrics(
    nodes,
    edges,
    "cpu",
    maxDegree,
    degreeByNode,
  );

  const categories: LossCategoryAnalysis[] = CATEGORY_DISPLAY_ORDER.map(
    (category) => {
      const comparison = categoryComparison(
        score.player[category],
        score.cpu[category],
      );
      return {
        category,
        label: LOSS_CATEGORY_LABELS[category],
        playerPoints: score.player[category],
        cpuPoints: score.cpu[category],
        ...comparison,
        inspection: {
          owner: comparison.status === "unfavorable" ? "cpu" : "player",
          category,
        },
      };
    },
  );

  const largestCpuLead = Math.max(
    ...categories.map((category) =>
      Math.max(0, category.cpuPoints - category.playerPoints),
    ),
  );
  const primaryCategories = CATEGORY_PRIORITY.filter((category) => {
    const row = categories.find((item) => item.category === category);
    return (
      row !== undefined &&
      row.cpuPoints - row.playerPoints === largestCpuLead
    );
  });
  const primaryRows = primaryCategories
    .map((category) =>
      categories.find((item) => item.category === category),
    )
    .filter((row): row is LossCategoryAnalysis => row !== undefined);
  const primaryTitle =
    primaryRows.length === 1
      ? `${primaryRows[0].label}で${largestCpuLead}点差がつきました。`
      : `${primaryRows.map((row) => row.label).join("・")}で、それぞれ${largestCpuLead}点差がつきました。`;
  const primaryDetails = primaryRows.map((row) =>
    categoryObservation(
      row.category,
      largestCpuLead,
      playerMetrics,
      cpuMetrics,
    ),
  );

  const tacticalNotes: string[] = [];
  if (cpuMetrics.hubs > playerMetrics.hubs) {
    tacticalNotes.push(
      `CPUはHubを${cpuMetrics.hubs}個、Playerは${playerMetrics.hubs}個確保しました。`,
    );
  }
  if (cpuMetrics.relayConnections > playerMetrics.relayConnections) {
    tacticalNotes.push(
      `CPUはRelayを含む接続を${cpuMetrics.relayConnections}本形成し、Playerの${playerMetrics.relayConnections}本を上回りました。`,
    );
  } else if (cpuMetrics.connections > playerMetrics.connections) {
    tacticalNotes.push(
      `CPUは同一所有者接続を${cpuMetrics.connections}本、Playerは${playerMetrics.connections}本形成しました。`,
    );
  }
  if (score.cpu.influence > score.player.influence) {
    tacticalNotes.push(
      `CPUは影響点を${score.cpu.influence}ターゲットで獲得し、Playerとの差は${score.cpu.influence - score.player.influence}点でした。`,
    );
  }
  if (cpuMetrics.routePoints > 0 && playerMetrics.routePoints === 0) {
    tacticalNotes.push(
      `CPUだけが最長ルートボーナスを獲得しました。CPUのルートは${cpuMetrics.routeDistance}接続でした。`,
    );
  } else if (cpuMetrics.routePoints > playerMetrics.routePoints) {
    tacticalNotes.push(
      `最長ルートはCPU ${cpuMetrics.routeDistance}接続、Player ${playerMetrics.routeDistance}接続でした。`,
    );
  }
  if (
    playerMetrics.components > 1 &&
    playerMetrics.components > cpuMetrics.components
  ) {
    tacticalNotes.push(
      `Playerの所有ノードは${playerMetrics.components}個の集団に分かれ、CPUは${cpuMetrics.components}個の集団でした。`,
    );
  }
  if (cpuMetrics.highestDegreeNodes > playerMetrics.highestDegreeNodes) {
    tacticalNotes.push(
      `接続数が盤面最大のノードをCPUは${cpuMetrics.highestDegreeNodes}個、Playerは${playerMetrics.highestDegreeNodes}個所有しました。`,
    );
  }

  return {
    finalMargin: score.cpu.total - score.player.total,
    primaryCategories,
    primaryTitle,
    primaryDetails,
    categories,
    tacticalNotes: tacticalNotes.slice(0, 4),
  };
}

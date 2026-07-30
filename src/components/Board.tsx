import { useMemo, useRef } from "react";
import { BOARD_HEIGHT, BOARD_WIDTH } from "../game/constants";
import { getScoreEvidence } from "../game/scoring";
import { getNodeMap } from "../game/selectors";
import type {
  CpuDifficulty,
  GameEdge,
  GameNode,
  Phase,
  ScoreEvidence,
  ScoreInspection,
  TerrainType,
} from "../game/types";
import { EdgeView } from "./EdgeView";
import { NodeView } from "./NodeView";

interface BoardProps {
  nodes: GameNode[];
  edges: GameEdge[];
  phase: Phase;
  selectedNodeId: string | null;
  cpuDifficulty: CpuDifficulty;
  scoreInspection: ScoreInspection | null;
  terrain: TerrainType;
  onClaim: (nodeId: string) => void;
  onSelect: (nodeId: string | null) => void;
  onDifficultyChange: (difficulty: CpuDifficulty) => void;
  onClearScoreInspection: () => void;
}

const TERRAIN_LABELS: Record<TerrainType, string> = {
  archipelago: "群島 / ARCHIPELAGO",
  hourglass: "砂時計 / HOURGLASS",
  ring: "環状路 / RING ROUTES",
  spine: "背骨 / SPINE",
  core: "中央核 / CORE",
  twin: "双峰 / TWIN DOMAINS",
  delta: "三角州 / DELTA",
  ladder: "梯子 / LADDER",
  crossroads: "十字路 / CROSSROADS",
  fortress: "要塞 / FORTRESS",
  river: "両岸 / RIVER BANKS",
  trident: "三叉 / TRIDENT",
  constellation: "星座 / CONSTELLATION",
  crescent: "三日月 / CRESCENT",
  basin: "多層盆地 / BASIN",
};

function evidenceDescription(evidence: ScoreEvidence): string {
  if (evidence.category === "route") {
    return `${evidence.itemCount} links in the single longest route earn ${evidence.points} points. Every 2 links score 1, up to 5.`;
  }
  if (evidence.points === 0) {
    return "No map locations currently contribute to this score.";
  }
  if (evidence.category === "base") {
    return `${evidence.itemCount} owned nodes total ${evidence.points} points. Hubs count 2; Normal and Relay count 1.`;
  }
  if (evidence.category === "connections") {
    return `${evidence.itemCount} same-owner links total ${evidence.points} points. Links touching a Relay count 2.`;
  }
  return `${evidence.itemCount} target nodes score 1 point each. Dashed rings are targets; solid rings supply influence.`;
}

const CATEGORY_LABELS = {
  base: "Base nodes",
  connections: "Connections",
  influence: "Influence",
  route: "Longest route",
} as const;

export function Board({
  nodes,
  edges,
  phase,
  selectedNodeId,
  cpuDifficulty,
  scoreInspection,
  terrain,
  onClaim,
  onSelect,
  onDifficultyChange,
  onClearScoreInspection,
}: BoardProps) {
  const nodeMap = useMemo(() => getNodeMap(nodes), [nodes]);
  const evidence = useMemo(
    () =>
      scoreInspection
        ? getScoreEvidence(
            nodes,
            edges,
            scoreInspection.owner,
            scoreInspection.category,
          )
        : null,
    [edges, nodes, scoreInspection],
  );
  const evidenceNodeIds = new Set(evidence?.nodeIds ?? []);
  const evidenceEdgeIds = new Set(evidence?.edgeIds ?? []);
  const targetNodeIds = new Set(evidence?.targetNodeIds ?? []);
  const contributorNodeIds = new Set(evidence?.contributorNodeIds ?? []);
  const refs = useRef(new Map<string, SVGGElement>());

  const moveFocus = (current: GameNode, key: string): void => {
    const directions: Record<string, [number, number]> = {
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
    };
    const [directionX, directionY] = directions[key] ?? [0, 0];
    const candidate = nodes
      .filter((node) => {
        if (node.owner !== null || node.id === current.id) return false;
        const deltaX = node.x - current.x;
        const deltaY = node.y - current.y;
        return deltaX * directionX + deltaY * directionY > 0;
      })
      .map((node) => {
        const deltaX = node.x - current.x;
        const deltaY = node.y - current.y;
        const forward = deltaX * directionX + deltaY * directionY;
        const sideways = Math.abs(deltaX * directionY - deltaY * directionX);
        return { node, rank: forward + sideways * 1.8 };
      })
      .sort((first, second) => first.rank - second.rank)[0]?.node;

    if (candidate) refs.current.get(candidate.id)?.focus();
  };

  return (
    <section className="board-card" aria-labelledby="board-title">
      <div className="board-toolbar">
        <div>
          <p className="section-kicker">
            Network map · {TERRAIN_LABELS[terrain]}
          </p>
          <h2 id="board-title">Control surface</h2>
        </div>
        <div className="board-controls">
          <label className="difficulty-control">
            <span>CPU</span>
            <select
              value={cpuDifficulty}
              onChange={(event) =>
                onDifficultyChange(event.target.value as CpuDifficulty)
              }
              aria-label="CPU difficulty"
            >
              <option value="easy">Easy</option>
              <option value="standard">Standard</option>
              <option value="hard">Hard</option>
            </select>
          </label>
          <span
            className={`phase-pill phase-${phase}`}
            role="status"
            aria-live="polite"
          >
            <span className="status-dot" />
            {phase === "playerTurn"
              ? "Your turn"
              : phase === "cpuThinking"
                ? "CPU evaluating"
                : "Analysis complete"}
          </span>
        </div>
      </div>

      {evidence && (
        <div
          className={`score-inspection-bar inspection-${evidence.owner}`}
          role="status"
          aria-live="polite"
        >
          <span className="inspection-owner" aria-hidden="true">
            {evidence.owner === "player" ? "P" : "C"}
          </span>
          <div>
            <strong>
              {evidence.owner === "player" ? "Player" : "CPU"} ·{" "}
              {CATEGORY_LABELS[evidence.category]} · {evidence.points} pts
            </strong>
            <span>{evidenceDescription(evidence)}</span>
          </div>
          <button
            type="button"
            onClick={onClearScoreInspection}
            aria-label="Clear score evidence highlight"
          >
            Clear
          </button>
        </div>
      )}

      <div className="board-shell">
        <svg
          className="board"
          viewBox={`0 0 ${BOARD_WIDTH} ${BOARD_HEIGHT}`}
          role="group"
          aria-label="Topology game board. Tab to an unclaimed node and press Enter or Space to claim it."
        >
          <defs>
            <pattern
              id="cpu-pattern"
              width="7"
              height="7"
              patternUnits="userSpaceOnUse"
              patternTransform="rotate(45)"
            >
              <line x1="0" y1="0" x2="0" y2="7" className="cpu-hatch" />
            </pattern>
          </defs>
          <g className="edges" aria-hidden="true">
            {edges.map((edge) => {
              const source = nodeMap.get(edge.sourceId);
              const target = nodeMap.get(edge.targetId);
              return source && target ? (
                <EdgeView
                  key={edge.id}
                  edge={edge}
                  source={source}
                  target={target}
                  highlighted={evidenceEdgeIds.has(edge.id)}
                  dimmed={Boolean(evidence) && !evidenceEdgeIds.has(edge.id)}
                  highlightOwner={evidence?.owner ?? null}
                />
              ) : null;
            })}
          </g>
          <g className="nodes">
            {nodes.map((node) => (
              <NodeView
                key={node.id}
                node={node}
                disabled={phase !== "playerTurn"}
                selected={selectedNodeId === node.id}
                scoreCategory={evidence?.category ?? null}
                scoreOwner={evidence?.owner ?? null}
                scoreHighlighted={evidenceNodeIds.has(node.id)}
                scoreDimmed={Boolean(evidence) && !evidenceNodeIds.has(node.id)}
                influenceTarget={targetNodeIds.has(node.id)}
                influenceContributor={contributorNodeIds.has(node.id)}
                onClaim={onClaim}
                onSelect={onSelect}
                onMoveFocus={moveFocus}
                registerRef={(nodeId, element) => {
                  if (element) refs.current.set(nodeId, element);
                  else refs.current.delete(nodeId);
                }}
              />
            ))}
          </g>
        </svg>
        <div className="board-axis board-axis-x" aria-hidden="true">
          <span>00</span>
          <span>25</span>
          <span>50</span>
          <span>75</span>
          <span>100</span>
        </div>
        <div className="board-axis board-axis-y" aria-hidden="true">
          <span>00</span>
          <span>50</span>
          <span>100</span>
        </div>
      </div>
      <p className="board-help">
        Select an open node · Tab / arrows to navigate · Enter to claim
      </p>
    </section>
  );
}

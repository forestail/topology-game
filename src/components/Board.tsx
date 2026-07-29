import { useMemo, useRef } from "react";
import { BOARD_HEIGHT, BOARD_WIDTH } from "../game/constants";
import { getNodeMap } from "../game/selectors";
import type { GameEdge, GameNode, Phase } from "../game/types";
import { EdgeView } from "./EdgeView";
import { NodeView } from "./NodeView";

interface BoardProps {
  nodes: GameNode[];
  edges: GameEdge[];
  phase: Phase;
  selectedNodeId: string | null;
  onClaim: (nodeId: string) => void;
  onSelect: (nodeId: string | null) => void;
}

export function Board({
  nodes,
  edges,
  phase,
  selectedNodeId,
  onClaim,
  onSelect,
}: BoardProps) {
  const nodeMap = useMemo(() => getNodeMap(nodes), [nodes]);
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
          <p className="section-kicker">Network map</p>
          <h2 id="board-title">Control surface</h2>
        </div>
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

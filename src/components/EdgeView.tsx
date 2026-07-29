import type { GameEdge, GameNode } from "../game/types";

interface EdgeViewProps {
  edge: GameEdge;
  source: GameNode;
  target: GameNode;
}

export function EdgeView({ edge, source, target }: EdgeViewProps) {
  const owner =
    source.owner && source.owner === target.owner ? source.owner : "neutral";
  const relay =
    source.type === "relay" || target.type === "relay";

  return (
    <line
      key={edge.id}
      className={`edge edge-${owner}${relay ? " edge-relay" : ""}`}
      x1={source.x}
      y1={source.y}
      x2={target.x}
      y2={target.y}
    />
  );
}

import type { GameEdge, GameNode, Turn } from "../game/types";

interface EdgeViewProps {
  edge: GameEdge;
  source: GameNode;
  target: GameNode;
  highlighted: boolean;
  dimmed: boolean;
  highlightOwner: Turn | null;
}

export function EdgeView({
  edge,
  source,
  target,
  highlighted,
  dimmed,
  highlightOwner,
}: EdgeViewProps) {
  const owner =
    source.owner && source.owner === target.owner ? source.owner : "neutral";
  const relay =
    source.type === "relay" || target.type === "relay";

  return (
    <line
      key={edge.id}
      className={[
        "edge",
        `edge-${owner}`,
        relay ? "edge-relay" : "",
        highlighted
          ? `edge-score-highlight edge-score-highlight-${highlightOwner}`
          : "",
        dimmed ? "edge-score-dimmed" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      x1={source.x}
      y1={source.y}
      x2={target.x}
      y2={target.y}
    />
  );
}

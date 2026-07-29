import { NODE_BASE_POINTS } from "../game/constants";
import type { GameNode } from "../game/types";

interface NodeViewProps {
  node: GameNode;
  disabled: boolean;
  selected: boolean;
  onClaim: (nodeId: string) => void;
  onSelect: (nodeId: string | null) => void;
  onMoveFocus: (node: GameNode, key: string) => void;
  registerRef: (nodeId: string, element: SVGGElement | null) => void;
}

export function NodeView({
  node,
  disabled,
  selected,
  onClaim,
  onSelect,
  onMoveFocus,
  registerRef,
}: NodeViewProps) {
  const available = node.owner === null && !disabled;
  const ownerLabel =
    node.owner === "player" ? "Player" : node.owner === "cpu" ? "CPU" : "Unclaimed";
  const typeLabel = node.type[0].toUpperCase() + node.type.slice(1);

  const activate = (): void => {
    if (available) onClaim(node.id);
  };

  return (
    <g
      ref={(element) => registerRef(node.id, element)}
      className={[
        "node",
        `node-${node.type}`,
        `node-${node.owner ?? "open"}`,
        available ? "node-available" : "",
        selected ? "node-selected" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      role="button"
      tabIndex={available ? 0 : -1}
      aria-disabled={!available}
      aria-label={`${node.id}, ${typeLabel}, ${NODE_BASE_POINTS[node.type]} base points, ${ownerLabel}`}
      onClick={activate}
      onFocus={() => onSelect(node.id)}
      onBlur={() => onSelect(null)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          activate();
          return;
        }
        if (event.key.startsWith("Arrow")) {
          event.preventDefault();
          onMoveFocus(node, event.key);
        }
      }}
    >
      <circle className="node-hit-area" cx={node.x} cy={node.y} r="29" />

      {node.type === "relay" ? (
        <>
          <rect
            className="node-shape"
            x={node.x - 15}
            y={node.y - 15}
            width="30"
            height="30"
            rx="4"
          />
          <circle className="relay-dot" cx={node.x} cy={node.y} r="3.2" />
        </>
      ) : (
        <>
          <circle className="node-shape" cx={node.x} cy={node.y} r="16" />
          {node.type === "hub" && (
            <circle className="hub-ring" cx={node.x} cy={node.y} r="22" />
          )}
        </>
      )}

      {node.owner && (
        <text
          className="owner-mark"
          x={node.x}
          y={node.y + 4}
          textAnchor="middle"
          aria-hidden="true"
        >
          {node.owner === "player" ? "P" : "C"}
        </text>
      )}
      <text
        className="node-id"
        x={node.x}
        y={node.y + 36}
        textAnchor="middle"
        aria-hidden="true"
      >
        {node.id.toUpperCase()}
      </text>
    </g>
  );
}

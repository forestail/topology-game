import { memo } from "react";
import { createTerrainUnderlaySpec } from "../game/terrainUnderlay";
import type { GameNode, TerrainType } from "../game/types";

interface TerrainUnderlayProps {
  seed: string;
  terrain: TerrainType;
  nodes: GameNode[];
  dimmed: boolean;
}

interface StaticTerrainMapProps {
  seed: string;
  terrain: TerrainType;
  nodes: GameNode[];
}

function pointsAttribute(points: Array<{ x: number; y: number }>): string {
  return points.map((point) => `${point.x},${point.y}`).join(" ");
}

function sameGeometry(
  previous: StaticTerrainMapProps,
  next: StaticTerrainMapProps,
): boolean {
  if (
    previous.seed !== next.seed ||
    previous.terrain !== next.terrain ||
    previous.nodes.length !== next.nodes.length
  ) {
    return false;
  }
  return previous.nodes.every((node, index) => {
    const nextNode = next.nodes[index];
    return (
      node.id === nextNode.id &&
      node.x === nextNode.x &&
      node.y === nextNode.y
    );
  });
}

const StaticTerrainMap = memo(function StaticTerrainMap({
  seed,
  terrain,
  nodes,
}: StaticTerrainMapProps) {
  const spec = createTerrainUnderlaySpec(seed, terrain, nodes);
  const hatchId = `${spec.id}-hatch`;

  return (
    <g id={spec.id} className={`terrain-map terrain-${terrain}`}>
      <defs>
        <pattern
          id={hatchId}
          width="14"
          height="14"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(35)"
        >
          <line
            className="terrain-hatch-line"
            x1="0"
            y1="0"
            x2="0"
            y2="14"
          />
        </pattern>
      </defs>

      <g className="terrain-regions">
        {spec.regions.map((region, index) => (
          <polygon
            key={`region-${index}`}
            className={`terrain-region terrain-region-${region.kind}`}
            points={pointsAttribute(region.points)}
            fill={region.kind === "zone" ? `url(#${hatchId})` : undefined}
          />
        ))}
      </g>

      <g className="terrain-ellipses">
        {spec.ellipses.map((ellipse, index) => (
          <ellipse
            key={`ellipse-${index}`}
            className={`terrain-ellipse terrain-ellipse-${ellipse.kind}`}
            cx={ellipse.cx}
            cy={ellipse.cy}
            rx={ellipse.rx}
            ry={ellipse.ry}
          />
        ))}
      </g>

      <g className="terrain-lines">
        {spec.lines.map((line, index) => {
          const commonProps = {
            className: `terrain-line terrain-line-${line.kind}`,
            points: pointsAttribute(line.points),
          };
          return line.closed ? (
            <polygon key={`line-${index}`} {...commonProps} />
          ) : (
            <polyline key={`line-${index}`} {...commonProps} />
          );
        })}
      </g>

      <g className="terrain-labels">
        {spec.labels.map((label, index) => (
          <text
            key={`label-${index}`}
            className="terrain-label"
            x={label.x}
            y={label.y}
            textAnchor="middle"
          >
            {label.text}
          </text>
        ))}
      </g>
    </g>
  );
}, sameGeometry);

export function TerrainUnderlay({
  seed,
  terrain,
  nodes,
  dimmed,
}: TerrainUnderlayProps) {
  return (
    <g
      className={`terrain-underlay${dimmed ? " is-dimmed" : ""}`}
      aria-hidden="true"
      pointerEvents="none"
    >
      <StaticTerrainMap seed={seed} terrain={terrain} nodes={nodes} />
    </g>
  );
}

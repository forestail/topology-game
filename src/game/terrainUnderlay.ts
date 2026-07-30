import {
  BOARD_HEIGHT,
  BOARD_PADDING,
  BOARD_WIDTH,
} from "./constants";
import { createSeededRandom, hashSeed, type RandomSource } from "./random";
import type { GameNode, TerrainType } from "./types";

export interface TacticalPoint {
  x: number;
  y: number;
}

export type TacticalLineKind =
  | "contour"
  | "boundary"
  | "water"
  | "route"
  | "minor";

export interface TacticalRegion {
  points: TacticalPoint[];
  kind: "land" | "zone" | "urban" | "water";
}

export interface TacticalLine {
  points: TacticalPoint[];
  kind: TacticalLineKind;
  closed: boolean;
}

export interface TacticalEllipse {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  kind: "contour" | "zone" | "urban";
}

export interface TacticalLabel {
  x: number;
  y: number;
  text: string;
}

export interface TerrainUnderlaySpec {
  id: string;
  terrain: TerrainType;
  regions: TacticalRegion[];
  lines: TacticalLine[];
  ellipses: TacticalEllipse[];
  labels: TacticalLabel[];
}

const EDGE_MARGIN = 20;

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function safePoint(x: number, y: number): TacticalPoint {
  return {
    x: Math.round(clamp(x, EDGE_MARGIN, BOARD_WIDTH - EDGE_MARGIN) * 10) / 10,
    y: Math.round(clamp(y, EDGE_MARGIN, BOARD_HEIGHT - EDGE_MARGIN) * 10) / 10,
  };
}

function jitter(random: RandomSource, amount: number): number {
  return (random() - 0.5) * amount * 2;
}

function centroid(
  items: Array<Pick<GameNode | TacticalPoint, "x" | "y">>,
): TacticalPoint {
  if (items.length === 0) return { x: BOARD_WIDTH / 2, y: BOARD_HEIGHT / 2 };
  return {
    x: items.reduce((sum, item) => sum + item.x, 0) / items.length,
    y: items.reduce((sum, item) => sum + item.y, 0) / items.length,
  };
}

function distanceSquared(first: TacticalPoint, second: TacticalPoint): number {
  return (first.x - second.x) ** 2 + (first.y - second.y) ** 2;
}

function clusterNodes(nodes: GameNode[], count: number): GameNode[][] {
  const ordered = [...nodes].sort(
    (first, second) =>
      first.x - second.x ||
      first.y - second.y ||
      first.id.localeCompare(second.id),
  );
  if (ordered.length === 0) return Array.from({ length: count }, () => []);

  const centers: TacticalPoint[] = [{ x: ordered[0].x, y: ordered[0].y }];
  while (centers.length < count) {
    const next = ordered
      .map((node) => ({
        node,
        distance: Math.min(
          ...centers.map((center) => distanceSquared(node, center)),
        ),
      }))
      .sort(
        (first, second) =>
          second.distance - first.distance ||
          first.node.id.localeCompare(second.node.id),
      )[0]?.node;
    centers.push(
      next
        ? { x: next.x, y: next.y }
        : { x: BOARD_WIDTH / 2, y: BOARD_HEIGHT / 2 },
    );
  }

  let groups: GameNode[][] = [];
  for (let iteration = 0; iteration < 8; iteration += 1) {
    groups = Array.from({ length: count }, () => []);
    for (const node of ordered) {
      let bestIndex = 0;
      for (let index = 1; index < centers.length; index += 1) {
        if (
          distanceSquared(node, centers[index]) <
          distanceSquared(node, centers[bestIndex])
        ) {
          bestIndex = index;
        }
      }
      groups[bestIndex].push(node);
    }
    for (let index = 0; index < centers.length; index += 1) {
      if (groups[index].length > 0) centers[index] = centroid(groups[index]);
    }
  }

  return groups;
}

function jaggedEllipse(
  centerX: number,
  centerY: number,
  radiusX: number,
  radiusY: number,
  pointCount: number,
  random: RandomSource,
  variance = 0.1,
): TacticalPoint[] {
  const phase = random() * Math.PI * 2;
  return Array.from({ length: pointCount }, (_, index) => {
    const angle = phase + (index / pointCount) * Math.PI * 2;
    const scale = 1 + jitter(random, variance);
    return safePoint(
      centerX + Math.cos(angle) * radiusX * scale,
      centerY + Math.sin(angle) * radiusY * scale,
    );
  });
}

function blobFromNodes(
  nodes: GameNode[],
  padding: number,
  random: RandomSource,
): TacticalPoint[] {
  if (nodes.length < 3) {
    const center = centroid(nodes);
    return jaggedEllipse(
      center.x,
      center.y,
      padding * 1.3,
      padding,
      10,
      random,
    );
  }

  const center = centroid(nodes);
  return [...nodes]
    .sort(
      (first, second) =>
        Math.atan2(first.y - center.y, first.x - center.x) -
        Math.atan2(second.y - center.y, second.x - center.x),
    )
    .map((node) => {
      const deltaX = node.x - center.x;
      const deltaY = node.y - center.y;
      const distance = Math.max(1, Math.hypot(deltaX, deltaY));
      const expansion = padding + jitter(random, padding * 0.18);
      return safePoint(
        node.x + (deltaX / distance) * expansion,
        node.y + (deltaY / distance) * expansion,
      );
    });
}

function routeBetween(
  start: TacticalPoint,
  end: TacticalPoint,
  random: RandomSource,
  segments = 5,
  bend = 20,
): TacticalPoint[] {
  return Array.from({ length: segments + 1 }, (_, index) => {
    const progress = index / segments;
    const edgeFade = Math.sin(progress * Math.PI);
    return safePoint(
      start.x + (end.x - start.x) * progress + jitter(random, bend) * edgeFade,
      start.y + (end.y - start.y) * progress + jitter(random, bend) * edgeFade,
    );
  });
}

function arcPoints(
  center: TacticalPoint,
  radiusX: number,
  radiusY: number,
  startAngle: number,
  endAngle: number,
  count: number,
  random: RandomSource,
): TacticalPoint[] {
  return Array.from({ length: count }, (_, index) => {
    const progress = count === 1 ? 0 : index / (count - 1);
    const angle = startAngle + (endAngle - startAngle) * progress;
    return safePoint(
      center.x + Math.cos(angle) * (radiusX + jitter(random, 7)),
      center.y + Math.sin(angle) * (radiusY + jitter(random, 6)),
    );
  });
}

function createBuilder(seed: string, terrain: TerrainType) {
  const spec: TerrainUnderlaySpec = {
    id: `terrain-${hashSeed(`${seed}:${terrain}:underlay-v1`).toString(36)}`,
    terrain,
    regions: [],
    lines: [],
    ellipses: [],
    labels: [],
  };

  return {
    spec,
    region(points: TacticalPoint[], kind: TacticalRegion["kind"] = "land") {
      spec.regions.push({ points: points.map((point) => safePoint(point.x, point.y)), kind });
    },
    line(
      points: TacticalPoint[],
      kind: TacticalLineKind,
      closed = false,
    ) {
      spec.lines.push({
        points: points.map((point) => safePoint(point.x, point.y)),
        kind,
        closed,
      });
    },
    ellipse(
      cx: number,
      cy: number,
      rx: number,
      ry: number,
      kind: TacticalEllipse["kind"] = "contour",
    ) {
      const safeCx = clamp(cx, EDGE_MARGIN, BOARD_WIDTH - EDGE_MARGIN);
      const safeCy = clamp(cy, EDGE_MARGIN, BOARD_HEIGHT - EDGE_MARGIN);
      spec.ellipses.push({
        cx: Math.round(safeCx * 10) / 10,
        cy: Math.round(safeCy * 10) / 10,
        rx:
          Math.round(
            Math.max(
              4,
              Math.min(rx, safeCx - EDGE_MARGIN, BOARD_WIDTH - EDGE_MARGIN - safeCx),
            ) * 10,
          ) / 10,
        ry:
          Math.round(
            Math.max(
              4,
              Math.min(ry, safeCy - EDGE_MARGIN, BOARD_HEIGHT - EDGE_MARGIN - safeCy),
            ) * 10,
          ) / 10,
        kind,
      });
    },
    label(x: number, y: number, text: string) {
      spec.labels.push({ ...safePoint(x, y), text });
    },
  };
}

function createArchipelago(
  nodes: GameNode[],
  random: RandomSource,
  builder: ReturnType<typeof createBuilder>,
): void {
  const groups = clusterNodes(nodes, 3);
  const centers = groups.map((group) => centroid(group));
  groups.forEach((group, index) => {
    const outline = blobFromNodes(group, 38, random);
    builder.region(outline);
    builder.line(outline, "contour", true);
    builder.label(centers[index].x, centers[index].y - 8, `ISLE ${index + 1}`);
  });
  builder.line(routeBetween(centers[0], centers[1], random, 6, 14), "water");
  builder.line(routeBetween(centers[1], centers[2], random, 6, 14), "water");
}

function createHourglass(
  nodes: GameNode[],
  random: RandomSource,
  builder: ReturnType<typeof createBuilder>,
): void {
  const center = centroid(nodes);
  const left = nodes.filter((node) => node.x < center.x);
  const right = nodes.filter((node) => node.x >= center.x);
  builder.region(blobFromNodes(left, 36, random), "zone");
  builder.region(blobFromNodes(right, 36, random), "zone");
  const start = { x: BOARD_PADDING, y: center.y };
  const end = { x: BOARD_WIDTH - BOARD_PADDING, y: center.y };
  builder.line(routeBetween(start, end, random, 8, 24), "route");
  builder.line(
    routeBetween(
      { x: BOARD_PADDING, y: center.y - 70 },
      { x: BOARD_WIDTH - BOARD_PADDING, y: center.y - 70 },
      random,
      8,
      14,
    ),
    "boundary",
  );
  builder.line(
    routeBetween(
      { x: BOARD_PADDING, y: center.y + 70 },
      { x: BOARD_WIDTH - BOARD_PADDING, y: center.y + 70 },
      random,
      8,
      14,
    ),
    "boundary",
  );
  builder.label(center.x, center.y - 18, "NARROW CORRIDOR");
}

function createRing(
  nodes: GameNode[],
  random: RandomSource,
  builder: ReturnType<typeof createBuilder>,
): void {
  const center = centroid(nodes);
  builder.ellipse(center.x, center.y, 360, 245, "zone");
  builder.ellipse(center.x, center.y, 275, 185);
  builder.ellipse(center.x, center.y, 165, 108, "zone");
  builder.ellipse(center.x, center.y, 118, 76);
  const phase = random() * Math.PI * 2;
  for (let sector = 0; sector < 4; sector += 1) {
    const angle = phase + (sector / 4) * Math.PI * 2;
    builder.line(
      [
        safePoint(
          center.x + Math.cos(angle) * 170,
          center.y + Math.sin(angle) * 112,
        ),
        safePoint(
          center.x + Math.cos(angle) * 352,
          center.y + Math.sin(angle) * 238,
        ),
      ],
      "route",
    );
  }
  builder.label(center.x, center.y, "INNER RING");
}

function createSpine(
  nodes: GameNode[],
  random: RandomSource,
  builder: ReturnType<typeof createBuilder>,
): void {
  const centers = clusterNodes(nodes, 6)
    .map((group) => centroid(group))
    .sort((first, second) => first.x - second.x);
  const ridge = centers.map((point) =>
    safePoint(point.x + jitter(random, 10), point.y + jitter(random, 12)),
  );
  builder.line(ridge, "route");
  builder.line(
    ridge.map((point) => safePoint(point.x, point.y - 30)),
    "contour",
  );
  builder.line(
    ridge.map((point) => safePoint(point.x, point.y + 30)),
    "contour",
  );
  centers.forEach((point, index) =>
    builder.ellipse(point.x, point.y, 58, 43, index % 2 ? "zone" : "contour"),
  );
  builder.label(centers[2].x, centers[2].y - 45, "SUPPLY SPINE");
}

function createCore(
  nodes: GameNode[],
  random: RandomSource,
  builder: ReturnType<typeof createBuilder>,
): void {
  const center = centroid(nodes);
  const centralNodes = [...nodes]
    .sort(
      (first, second) =>
        distanceSquared(first, center) - distanceSquared(second, center),
    )
    .slice(0, 6);
  const satellites = clusterNodes(
    nodes.filter((node) => !centralNodes.includes(node)),
    3,
  );
  builder.ellipse(center.x, center.y, 132, 96, "urban");
  builder.ellipse(center.x, center.y, 92, 66, "contour");
  satellites.forEach((group, index) => {
    const outline = blobFromNodes(group, 28, random);
    const satelliteCenter = centroid(group);
    builder.region(outline, "zone");
    builder.line(outline, "boundary", true);
    builder.line(routeBetween(center, satelliteCenter, random, 4, 10), "route");
    builder.label(
      satelliteCenter.x,
      satelliteCenter.y,
      `DISTRICT ${String.fromCharCode(65 + index)}`,
    );
  });
  builder.label(center.x, center.y, "CENTRAL CORE");
}

function createTwin(
  nodes: GameNode[],
  random: RandomSource,
  builder: ReturnType<typeof createBuilder>,
): void {
  const groups = clusterNodes(nodes, 2).sort(
    (first, second) => centroid(first).x - centroid(second).x,
  );
  const centers = groups.map((group) => centroid(group));
  groups.forEach((group, index) => {
    const outline = blobFromNodes(group, 42, random);
    builder.region(outline, "zone");
    builder.line(outline, "contour", true);
    builder.label(centers[index].x, centers[index].y, `DOMAIN ${index + 1}`);
  });
  const boundaryX = (centers[0].x + centers[1].x) / 2;
  builder.line(
    routeBetween(
      { x: boundaryX, y: BOARD_PADDING },
      { x: boundaryX, y: BOARD_HEIGHT - BOARD_PADDING },
      random,
      8,
      24,
    ),
    "boundary",
  );
}

function createDelta(
  nodes: GameNode[],
  random: RandomSource,
  builder: ReturnType<typeof createBuilder>,
): void {
  const center = centroid(nodes);
  const groups = clusterNodes(nodes, 3);
  const outlets = groups.map((group) => centroid(group));
  const source = safePoint(center.x, BOARD_PADDING);
  outlets.forEach((outlet) => {
    builder.line(routeBetween(source, outlet, random, 7, 28), "water");
  });
  groups.forEach((group) => {
    const island = blobFromNodes(group, 24, random);
    builder.region(island, "land");
    builder.line(island, "contour", true);
  });
  builder.label(center.x, center.y, "DELTA SECTOR");
}

function createLadder(
  nodes: GameNode[],
  random: RandomSource,
  builder: ReturnType<typeof createBuilder>,
): void {
  const sortedX = [...nodes].sort((first, second) => first.x - second.x);
  const railXs = [0.15, 0.38, 0.62, 0.85].map((fraction) => {
    const node = sortedX[Math.min(sortedX.length - 1, Math.floor(fraction * sortedX.length))];
    return node?.x ?? BOARD_WIDTH * fraction;
  });
  railXs.forEach((x) => {
    builder.line(
      routeBetween(
        { x, y: BOARD_PADDING },
        { x, y: BOARD_HEIGHT - BOARD_PADDING },
        random,
        9,
        7,
      ),
      "route",
    );
  });
  for (let rung = 0; rung < 5; rung += 1) {
    const y = 110 + rung * 105 + jitter(random, 8);
    builder.line(
      routeBetween(
        { x: railXs[0], y },
        { x: railXs[railXs.length - 1], y },
        random,
        7,
        5,
      ),
      rung % 2 === 0 ? "route" : "minor",
    );
  }
  builder.label(railXs[1], 82, "GRID LINE");
}

function createCrossroads(
  nodes: GameNode[],
  random: RandomSource,
  builder: ReturnType<typeof createBuilder>,
): void {
  const center = centroid(nodes);
  const regions = [
    jaggedEllipse(center.x - 240, center.y - 150, 190, 112, 10, random),
    jaggedEllipse(center.x + 240, center.y - 150, 190, 112, 10, random),
    jaggedEllipse(center.x - 240, center.y + 150, 190, 112, 10, random),
    jaggedEllipse(center.x + 240, center.y + 150, 190, 112, 10, random),
  ];
  regions.forEach((region) => builder.region(region, "zone"));
  builder.line(
    routeBetween(
      { x: BOARD_PADDING, y: center.y },
      { x: BOARD_WIDTH - BOARD_PADDING, y: center.y },
      random,
      8,
      8,
    ),
    "route",
  );
  builder.line(
    routeBetween(
      { x: center.x, y: BOARD_PADDING },
      { x: center.x, y: BOARD_HEIGHT - BOARD_PADDING },
      random,
      6,
      8,
    ),
    "route",
  );
  builder.ellipse(center.x, center.y, 82, 62, "urban");
  builder.label(center.x, center.y, "CROSSROADS");
}

function createFortress(
  nodes: GameNode[],
  random: RandomSource,
  builder: ReturnType<typeof createBuilder>,
): void {
  const center = centroid(nodes);
  const outer = jaggedEllipse(center.x, center.y, 370, 250, 16, random, 0.035);
  const inner = jaggedEllipse(center.x, center.y, 225, 150, 12, random, 0.045);
  builder.region(outer, "zone");
  builder.line(outer, "boundary", true);
  builder.line(inner, "boundary", true);
  builder.ellipse(center.x, center.y, 112, 78, "urban");
  builder.ellipse(center.x, center.y, 70, 48, "contour");
  for (let index = 0; index < 4; index += 1) {
    const angle = (index / 4) * Math.PI * 2 + random() * 0.12;
    builder.line(
      [
        safePoint(
          center.x + Math.cos(angle) * 112,
          center.y + Math.sin(angle) * 78,
        ),
        safePoint(
          center.x + Math.cos(angle) * 365,
          center.y + Math.sin(angle) * 245,
        ),
      ],
      "route",
    );
  }
  builder.label(center.x, center.y, "CITADEL");
}

function createRiver(
  nodes: GameNode[],
  random: RandomSource,
  builder: ReturnType<typeof createBuilder>,
): void {
  const center = centroid(nodes);
  const bankOffset = 38;
  const riverCenter = routeBetween(
    { x: center.x, y: BOARD_PADDING },
    { x: center.x, y: BOARD_HEIGHT - BOARD_PADDING },
    random,
    10,
    34,
  );
  const leftBank = riverCenter.map((point) =>
    safePoint(point.x - bankOffset, point.y),
  );
  const rightBank = riverCenter.map((point) =>
    safePoint(point.x + bankOffset, point.y),
  );
  builder.region(
    [...leftBank, ...rightBank.slice().reverse()],
    "water",
  );
  builder.line(leftBank, "water");
  builder.line(rightBank, "water");
  const leftNodes = nodes.filter((node) => node.x < center.x);
  const rightNodes = nodes.filter((node) => node.x >= center.x);
  builder.region(blobFromNodes(leftNodes, 28, random), "zone");
  builder.region(blobFromNodes(rightNodes, 28, random), "zone");
  for (let crossing = 0; crossing < 3; crossing += 1) {
    const y = 155 + crossing * 165 + jitter(random, 16);
    builder.line(
      [
        safePoint(center.x - 82, y),
        safePoint(center.x + 82, y + jitter(random, 8)),
      ],
      "route",
    );
  }
  builder.label(center.x + 58, center.y - 20, "RIVER LINE");
}

function createTrident(
  nodes: GameNode[],
  random: RandomSource,
  builder: ReturnType<typeof createBuilder>,
): void {
  const groups = clusterNodes(nodes, 4);
  const boardCenter = { x: BOARD_WIDTH / 2, y: BOARD_HEIGHT / 2 };
  const centers = groups.map((group) => centroid(group));
  const command = [...centers].sort(
    (first, second) =>
      distanceSquared(first, boardCenter) - distanceSquared(second, boardCenter),
  )[0];
  const arms = centers.filter((center) => center !== command);
  builder.ellipse(command.x, command.y, 78, 58, "urban");
  arms.forEach((arm, index) => {
    builder.line(routeBetween(command, arm, random, 6, 15), "route");
    builder.ellipse(arm.x, arm.y, 72, 54, "zone");
    builder.label(arm.x, arm.y, `ARM ${index + 1}`);
  });
  builder.label(command.x, command.y, "TRIDENT HQ");
}

function createConstellation(
  nodes: GameNode[],
  random: RandomSource,
  builder: ReturnType<typeof createBuilder>,
): void {
  const groups = clusterNodes(nodes, 6);
  const boardCenter = { x: BOARD_WIDTH / 2, y: BOARD_HEIGHT / 2 };
  const centers = groups.map((group) => centroid(group));
  const command = [...centers].sort(
    (first, second) =>
      distanceSquared(first, boardCenter) - distanceSquared(second, boardCenter),
  )[0];
  builder.ellipse(command.x, command.y, 74, 54, "urban");
  centers
    .filter((center) => center !== command)
    .forEach((outpost, index) => {
      builder.line(routeBetween(command, outpost, random, 5, 13), "route");
      builder.ellipse(outpost.x, outpost.y, 62, 46, "zone");
      builder.label(outpost.x, outpost.y, `POST ${index + 1}`);
    });
  builder.label(command.x, command.y, "COMMAND");
}

function createCrescent(
  nodes: GameNode[],
  random: RandomSource,
  builder: ReturnType<typeof createBuilder>,
): void {
  const center = centroid(nodes);
  const phase = random() * Math.PI * 2;
  const outer = arcPoints(
    center,
    365,
    250,
    phase - Math.PI * 0.78,
    phase + Math.PI * 0.78,
    18,
    random,
  );
  const inner = arcPoints(
    center,
    215,
    142,
    phase + Math.PI * 0.78,
    phase - Math.PI * 0.78,
    14,
    random,
  );
  builder.region([...outer, ...inner], "land");
  builder.line(outer, "contour");
  builder.line([...inner].reverse(), "boundary");
  const middle = arcPoints(
    center,
    290,
    196,
    phase - Math.PI * 0.75,
    phase + Math.PI * 0.75,
    18,
    random,
  );
  builder.line(middle, "route");
  builder.label(center.x, center.y, "INNER VOID");
}

function createBasin(
  nodes: GameNode[],
  random: RandomSource,
  builder: ReturnType<typeof createBuilder>,
): void {
  const center = centroid(nodes);
  builder.ellipse(center.x, center.y, 370, 250, "zone");
  builder.ellipse(center.x, center.y, 305, 205);
  builder.ellipse(center.x, center.y, 230, 152, "zone");
  builder.ellipse(center.x, center.y, 155, 102);
  builder.ellipse(center.x, center.y, 80, 54, "urban");
  const phase = random() * Math.PI * 2;
  for (let index = 0; index < 3; index += 1) {
    const angle = phase + (index / 3) * Math.PI * 2;
    builder.line(
      [
        safePoint(
          center.x + Math.cos(angle) * 80,
          center.y + Math.sin(angle) * 54,
        ),
        safePoint(
          center.x + Math.cos(angle) * 365,
          center.y + Math.sin(angle) * 245,
        ),
      ],
      "route",
    );
  }
  builder.label(center.x, center.y, "BASIN CENTER");
}

export function createTerrainUnderlaySpec(
  seed: string,
  terrain: TerrainType,
  nodes: GameNode[],
): TerrainUnderlaySpec {
  const random = createSeededRandom(`${seed}:${terrain}:underlay-v1`);
  const builder = createBuilder(seed, terrain);
  const creators: Record<
    TerrainType,
    (
      terrainNodes: GameNode[],
      terrainRandom: RandomSource,
      terrainBuilder: ReturnType<typeof createBuilder>,
    ) => void
  > = {
    archipelago: createArchipelago,
    hourglass: createHourglass,
    ring: createRing,
    spine: createSpine,
    core: createCore,
    twin: createTwin,
    delta: createDelta,
    ladder: createLadder,
    crossroads: createCrossroads,
    fortress: createFortress,
    river: createRiver,
    trident: createTrident,
    constellation: createConstellation,
    crescent: createCrescent,
    basin: createBasin,
  };

  creators[terrain](nodes, random, builder);
  return builder.spec;
}

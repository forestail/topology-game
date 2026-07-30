import { describe, expect, it } from "vitest";
import { BOARD_HEIGHT, BOARD_WIDTH } from "./constants";
import { generateBoard } from "./generateBoard";
import { createTerrainUnderlaySpec } from "./terrainUnderlay";
import type { TerrainType } from "./types";

const TERRAINS: TerrainType[] = [
  "archipelago",
  "hourglass",
  "ring",
  "spine",
  "core",
  "twin",
  "delta",
  "ladder",
  "crossroads",
  "fortress",
  "river",
  "trident",
  "constellation",
  "crescent",
  "basin",
];

describe("createTerrainUnderlaySpec", () => {
  it("reproduces the same tactical map from the same inputs", () => {
    const board = generateBoard("underlay-repeat", "archipelago");
    expect(
      createTerrainUnderlaySpec(
        "underlay-repeat",
        board.terrain,
        board.nodes,
      ),
    ).toEqual(
      createTerrainUnderlaySpec(
        "underlay-repeat",
        board.terrain,
        board.nodes,
      ),
    );
  });

  it("varies contour details when the seed changes", () => {
    const board = generateBoard("underlay-shared-geometry", "fortress");
    expect(
      createTerrainUnderlaySpec("underlay-a", "fortress", board.nodes),
    ).not.toEqual(
      createTerrainUnderlaySpec("underlay-b", "fortress", board.nodes),
    );
  });

  it("generates terrain-specific data for all fifteen families", () => {
    const signatures = new Set<string>();
    for (const terrain of TERRAINS) {
      const board = generateBoard(`underlay-${terrain}`, terrain);
      const spec = createTerrainUnderlaySpec(
        `underlay-${terrain}`,
        terrain,
        board.nodes,
      );
      expect(
        spec.regions.length + spec.lines.length + spec.ellipses.length,
      ).toBeGreaterThan(0);
      signatures.add(
        JSON.stringify({
          regions: spec.regions.length,
          lines: spec.lines.length,
          ellipses: spec.ellipses.length,
          labels: spec.labels.length,
          firstRegion: spec.regions[0]?.points,
          firstLine: spec.lines[0]?.points,
        }),
      );
    }
    expect(signatures.size).toBe(TERRAINS.length);
  });

  it("keeps every generated coordinate inside the board", () => {
    for (const terrain of TERRAINS) {
      const board = generateBoard(`underlay-bounds-${terrain}`, terrain);
      const spec = createTerrainUnderlaySpec(
        `underlay-bounds-${terrain}`,
        terrain,
        board.nodes,
      );
      const points = [
        ...spec.regions.flatMap((region) => region.points),
        ...spec.lines.flatMap((line) => line.points),
        ...spec.labels,
      ];
      for (const point of points) {
        expect(point.x).toBeGreaterThanOrEqual(0);
        expect(point.x).toBeLessThanOrEqual(BOARD_WIDTH);
        expect(point.y).toBeGreaterThanOrEqual(0);
        expect(point.y).toBeLessThanOrEqual(BOARD_HEIGHT);
      }
      for (const ellipse of spec.ellipses) {
        expect(ellipse.cx - ellipse.rx).toBeGreaterThanOrEqual(0);
        expect(ellipse.cx + ellipse.rx).toBeLessThanOrEqual(BOARD_WIDTH);
        expect(ellipse.cy - ellipse.ry).toBeGreaterThanOrEqual(0);
        expect(ellipse.cy + ellipse.ry).toBeLessThanOrEqual(BOARD_HEIGHT);
      }
    }
  });

  it("does not mutate node geometry or ownership", () => {
    const board = generateBoard("underlay-purity", "river");
    const before = structuredClone(board.nodes);
    createTerrainUnderlaySpec("underlay-purity", "river", board.nodes);
    expect(board.nodes).toEqual(before);
  });
});
